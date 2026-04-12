// ═══════════════════════════════════════════════════════════════
// Hindsight Memory Browser — Browse, search, and store memories
// ═══════════════════════════════════════════════════════════════
// Memories are fetched only when the user clicks Recall (action=recall), not on mount.

"use client";

import { useState, useCallback } from "react";
import {
  Brain, Search, Plus, Sparkles, List, FileText,
  Settings, RefreshCw, Clock, Tag,
} from "lucide-react";
import { SearchInput } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { LoadingSpinner, EmptyState, ErrorBanner } from "@/components/ui/LoadingSpinner";
import { useToast } from "@/components/ui/Toast";

interface Memory {
  id?: string;
  content: string;
  type?: string;
  score?: number;
  created_at?: string;
  metadata?: Record<string, unknown>;
}

type Tab = "memories" | "directives" | "mental-models";

export default function HindsightBrowser() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasRecalled, setHasRecalled] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("memories");
  const [reflectResult, setReflectResult] = useState<string | null>(null);
  const [reflecting, setReflecting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newTags, setNewTags] = useState("");
  const [adding, setAdding] = useState(false);
  const [health, setHealth] = useState<{ available: boolean; mode: string; message?: string; error?: string } | null>(null);
  const { showToast, toastElement } = useToast();

  const fetchHealthOnly = useCallback(async () => {
    try {
      const res = await fetch("/api/memory/hindsight?action=health");
      const data = await res.json();
      setHealth(data.data || { available: false, mode: "unknown", message: "No response" });
    } catch {
      setHealth({ available: false, mode: "error" });
    }
  }, []);

  const applyRecallPayload = useCallback(
    async (
      payload:
        | {
            memories?: Memory[];
            available?: boolean;
            error?: string;
            mode?: string;
            message?: string;
          }
        | undefined
    ) => {
      setMemories(payload?.memories || []);
      const backendSaysDown =
        payload?.available === false ||
        (typeof payload?.error === "string" && payload.error.length > 0);
      if (!backendSaysDown) {
        setHealth({
          available: true,
          mode: typeof payload?.mode === "string" ? payload.mode : "ok",
          message: typeof payload?.message === "string" ? payload.message : undefined,
        });
      } else {
        await fetchHealthOnly();
      }
    },
    [fetchHealthOnly]
  );

  const runRecall = useCallback(async () => {
    const q = search.trim();
    if (!q) {
      showToast("Enter a search query first", "info");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/memory/hindsight?action=recall&query=${encodeURIComponent(q)}`
      );
      const body = await res.json();
      const payload = body.data as
        | {
            memories?: Memory[];
            available?: boolean;
            error?: string;
            mode?: string;
            message?: string;
          }
        | undefined;
      setHasRecalled(true);
      await applyRecallPayload(payload);
    } catch {
      showToast("Recall failed", "error");
      await fetchHealthOnly();
    } finally {
      setLoading(false);
    }
  }, [search, showToast, applyRecallPayload, fetchHealthOnly]);

  const handleSearch = () => {
    void runRecall();
  };

  const handleRefreshMemories = () => {
    void runRecall();
  };

  const handleReflect = async () => {
    if (!search.trim()) return;
    setReflecting(true);
    setReflectResult(null);
    try {
      const res = await fetch(`/api/memory/hindsight?action=reflect&query=${encodeURIComponent(search)}`);
      const data = await res.json();
      setReflectResult(data.data?.response || "No reflection generated");
    } catch {
      showToast("Reflection failed", "error");
    } finally {
      setReflecting(false);
    }
  };

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    setAdding(true);
    try {
      const tags = newTags.split(",").map(t => t.trim()).filter(Boolean);
      const res = await fetch("/api/memory/hindsight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent, tags: tags.length > 0 ? tags : undefined }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast("Memory stored", "success");
      setShowAddModal(false);
      setNewContent("");
      setNewTags("");
    } catch {
      showToast("Failed to store memory", "error");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      {toastElement}
      {/* Health Status */}
      {health && !health.available && (
        <div className="mb-4">
          <ErrorBanner message={`Hindsight ${health.mode}: ${health.message || health.error || "not responding"}`} />
        </div>
      )}

      {/* Search Bar */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search memories (semantic search)..."
            accentColor="pink"
          />
        </div>
        <Button
          variant="secondary"
          color="pink"
          size="sm"
          icon={Search}
          onClick={handleSearch}
          disabled={!search.trim() || loading}
        >
          Recall
        </Button>
        <Button
          variant="secondary"
          color="purple"
          size="sm"
          icon={Sparkles}
          onClick={handleReflect}
          disabled={reflecting || !search.trim()}
        >
          {reflecting ? "Reflecting..." : "Reflect"}
        </Button>
        <Button variant="primary" color="pink" size="sm" icon={Plus} onClick={() => setShowAddModal(true)}>
          Add Memory
        </Button>
      </div>

      {/* Reflect Result */}
      {reflectResult && (
        <div className="mb-6 p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-purple-300">Reflection</span>
          </div>
          <p className="text-sm text-white/70 leading-relaxed">{reflectResult}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
        {([
          { id: "memories" as Tab, label: "Memories", icon: List },
          { id: "directives" as Tab, label: "Directives", icon: FileText },
          { id: "mental-models" as Tab, label: "Mental Models", icon: Settings },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              activeTab === tab.id
                ? "bg-pink-500/20 text-pink-300"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          icon={RefreshCw}
          onClick={handleRefreshMemories}
          disabled={!search.trim()}
          title={!search.trim() ? "Enter a query to refresh recall results" : "Run the same search again"}
        >
          Refresh
        </Button>
      </div>

      {/* Content */}
      {activeTab === "memories" && (
        <>
          {loading ? (
            <LoadingSpinner text="Recalling memories..." />
          ) : !hasRecalled ? (
            <EmptyState
              icon={Brain}
              title="Semantic recall"
              description="Enter a query above and click Recall to search your Hindsight memory bank. Nothing is fetched until you do."
            />
          ) : memories.length === 0 ? (
            <EmptyState
              icon={Brain}
              title="No memories found"
              description="Try a different search query, or store new memories with Add Memory or the agent."
            />
          ) : (
            <div className="space-y-3">
              {memories.map((memory, i) => (
                <div
                  key={memory.id || i}
                  className="rounded-xl border border-white/10 bg-dark-900/50 p-4 hover:border-pink-500/20 transition-colors"
                >
                  <p className="text-sm text-white/70 leading-relaxed mb-2">{memory.content}</p>
                  <div className="flex items-center gap-3 text-xs text-white/30">
                    {memory.type && <Badge color="gray" size="sm">{memory.type}</Badge>}
                    {memory.score !== undefined && (
                      <span>Relevance: {(memory.score * 100).toFixed(0)}%</span>
                    )}
                    {memory.created_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(memory.created_at).toLocaleDateString()}
                      </span>
                    )}
                    {memory.metadata && Object.keys(memory.metadata).length > 0 && (
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {Object.keys(memory.metadata).join(", ")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "directives" && (
        <div className="text-center py-12 text-white/30">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Directives management coming soon</p>
          <p className="text-xs mt-1">Requires Hindsight client mode</p>
        </div>
      )}

      {activeTab === "mental-models" && (
        <div className="text-center py-12 text-white/30">
          <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Mental models management coming soon</p>
          <p className="text-xs mt-1">Requires Hindsight client mode</p>
        </div>
      )}

      {/* Add Memory Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Store New Memory" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/50 mb-1">Memory Content</label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="What should the agent remember?"
              className="w-full h-32 bg-dark-800 border border-white/10 rounded-lg p-3 text-sm text-white/80 resize-none focus:border-pink-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-white/50 mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="e.g. user_pref, project, tech"
              className="w-full bg-dark-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:border-pink-500/50 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button
              variant="primary"
              color="pink"
              size="sm"
              onClick={handleAdd}
              disabled={adding || !newContent.trim()}
            >
              {adding ? "Storing..." : "Store Memory"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
