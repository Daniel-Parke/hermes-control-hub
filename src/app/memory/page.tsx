// ═══════════════════════════════════════════════════════════════
// Memory Manager — Provider-aware memory browser
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect } from "react";
import { Brain } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { MemoryProviderType } from "@/types/hermes";

// Lazy load provider-specific components
import HindsightBrowser from "@/components/memory/HindsightBrowser";

// Holographic browser (inline for backward compat)
function HolographicBrowser() {
  const [data, setData] = useState<{
    facts: Array<{
      id: number; content: string; category: string; tags: string;
      trust: number; createdAt: string; updatedAt: string;
    }>; total: number; dbSize: number; available: boolean;
    provider: string; message?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/memory")
      .then((r) => r.json())
      .then((d) => setData(d.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading memory..." />;

  if (!data?.available) {
    return (
      <div className="text-center py-12">
        <Brain className="w-12 h-12 text-pink-400/40 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-white mb-2">Memory Not Available</h2>
        <p className="text-sm text-white/50">{data?.message || "No memory provider configured"}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 text-xs text-white/30">
        {data.total} facts stored — {data.dbSize > 0 ? (data.dbSize / 1024).toFixed(1) + " KB" : "Unknown size"}
      </div>
      <div className="space-y-3">
        {data.facts.map((fact) => (
          <div key={fact.id} className="rounded-xl border border-white/10 bg-dark-900/50 p-4">
            <p className="text-sm text-white/70">{fact.content}</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-white/30">
              <span className="bg-pink-500/10 text-pink-300 px-2 py-0.5 rounded">{fact.category}</span>
              {fact.tags && <span>{fact.tags}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MemoryPage() {
  const [provider, setProvider] = useState<MemoryProviderType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Detect provider from config — use a simple config read, not the memory API
    const timer = setTimeout(() => {
      if (!cancelled) {
        setProvider("none");
        setLoading(false);
      }
    }, 5000); // 5s fallback

    fetch("/api/memory", { signal: AbortSignal.timeout(4000) })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setProvider(d.data?.provider || "none");
          clearTimeout(timer);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProvider("none");
          clearTimeout(timer);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const getTitle = () => {
    switch (provider) {
      case "hindsight": return "Hindsight Memory";
      case "holographic": return "Holographic Memory";
      default: return "Memory";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 grid-bg">
        <PageHeader icon={Brain} title="Memory" subtitle="Loading..." color="pink" />
        <div className="px-6 py-12"><LoadingSpinner text="Detecting memory provider..." /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 grid-bg">
      <PageHeader
        icon={Brain}
        title={getTitle()}
        subtitle={provider === "hindsight" ? "Knowledge graph memory with semantic search" :
                  provider === "holographic" ? "Structured fact storage with trust scoring" :
                  "No memory provider configured"}
        color="pink"
      />

      <div className="px-6 py-6">
        {provider === "hindsight" && <HindsightBrowser />}
        {provider === "holographic" && <HolographicBrowser />}
        {provider === "none" && (
          <div className="text-center py-12">
            <Brain className="w-12 h-12 text-pink-400/40 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-white mb-2">No Memory Provider</h2>
            <p className="text-sm text-white/50">Configure a memory provider to enable persistent memory.</p>
            <p className="text-xs text-white/30 font-mono mt-2">hermes memory setup</p>
          </div>
        )}
      </div>
    </div>
  );
}
