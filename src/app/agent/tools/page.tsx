// ═══════════════════════════════════════════════════════════════
// Tools Manager — Profile-aware tools with inline toggles
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wrench, Check, ChevronDown, ChevronRight, Save,
  AlertCircle, Info, ToggleLeft, ToggleRight,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

interface ToolsetInfo {
  label: string;
  description: string;
  category: "core" | "composite" | "platform";
}

interface ToolsData {
  available: Record<string, ToolsetInfo>;
  platformToolsets: Record<string, string[]>;
  activeToolsets: string[];
  profile: string;
}

const PLATFORMS = ["cli", "discord", "telegram", "slack", "whatsapp", "signal", "homeassistant"];
const PLATFORM_LABELS: Record<string, string> = {
  cli: "CLI (Terminal)",
  discord: "Discord",
  telegram: "Telegram",
  slack: "Slack",
  whatsapp: "WhatsApp",
  signal: "Signal",
  homeassistant: "Home Assistant",
};

const CATEGORY_LABELS: Record<string, string> = {
  core: "Core Tools",
  composite: "Agent Tools",
  platform: "Platform Tools",
};

export default function ToolsPage() {
  const [data, setData] = useState<ToolsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [selectedPlatform, setSelectedPlatform] = useState("cli");
  const [selectedProfile, setSelectedProfile] = useState("default");
  const [profiles, setProfiles] = useState<Array<{ id: string; name: string }>>([]);
  const [pendingChanges, setPendingChanges] = useState<Record<string, string[]>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    core: true,
    composite: true,
  });
  const toast = useToast();

  // Load profiles
  useEffect(() => {
    fetch("/api/agent/profiles")
      .then((res) => res.json())
      .then((d) => {
        const ps = (d.data?.profiles || []).map((p: { id: string; name: string }) => ({
          id: p.id,
          name: p.name,
        }));
        setProfiles(ps);
      })
      .catch(() => {});
  }, []);

  const loadTools = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tools?profile=${selectedProfile}`);
      const d = await res.json();
      setData(d.data);
      setPendingChanges({});
    } catch {
      toast.showToast("Failed to load tools", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedProfile, toast]);

  useEffect(() => { loadTools(); }, [loadTools]);

  const isToolEnabled = (toolset: string) => {
    if (selectedPlatform in pendingChanges) {
      return pendingChanges[selectedPlatform].includes(toolset);
    }
    return data?.platformToolsets[selectedPlatform]?.includes(toolset) ?? false;
  };

  const toggleTool = (toolset: string) => {
    setPendingChanges((prev) => {
      const current = prev[selectedPlatform] ??
        data?.platformToolsets[selectedPlatform] ??
        [];
      const next = current.includes(toolset)
        ? current.filter((t) => t !== toolset)
        : [...current, toolset];
      return { ...prev, [selectedPlatform]: next };
    });
  };

  const saveChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      for (const [platform, toolsets] of Object.entries(pendingChanges)) {
        await fetch("/api/tools", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform, toolsets, profile: selectedProfile }),
        });
      }
      setSaveStatus("saved");
      setPendingChanges({});
      loadTools();
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  // Group tools by category
  const toolsByCategory: Record<string, Array<[string, ToolsetInfo]>> = {};
  if (data?.available) {
    for (const [name, info] of Object.entries(data.available)) {
      const cat = info.category || "core";
      if (!toolsByCategory[cat]) toolsByCategory[cat] = [];
      toolsByCategory[cat].push([name, info]);
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 grid-bg">
      <PageHeader
        icon={Wrench}
        title="Tools Manager"
        subtitle={`Configure toolsets — ${selectedPlatform.toUpperCase()}`}
        color="orange"
        actions={
          <div className="flex items-center gap-3">
            {/* Profile Selector */}
            <select
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value)}
              className="bg-dark-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:border-orange-500/50 focus:outline-none"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {hasPendingChanges && (
              <Button
                variant="primary"
                color="orange"
                size="sm"
                icon={saveStatus === "saved" ? Check : saveStatus === "error" ? AlertCircle : Save}
                onClick={saveChanges}
                disabled={saving}
              >
                {saving ? "Saving..." : saveStatus === "saved" ? "Saved!" : "Save Changes"}
              </Button>
            )}
          </div>
        }
      />

      <div className="px-6 py-6">
        {/* Platform Selector */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPlatform(p)}
              className={`text-sm font-mono px-3 py-1.5 rounded-lg transition-colors ${
                selectedPlatform === p
                  ? "bg-neon-orange/20 text-neon-orange border border-orange-500/30"
                  : "text-white/40 hover:text-white/60 border border-transparent"
              }`}
            >
              {PLATFORM_LABELS[p] || p}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingSpinner text="Loading tools..." />
        ) : (
          <div className="space-y-4">
            {Object.entries(toolsByCategory).map(([category, tools]) => {
              const isExpanded = expandedCategories[category] ?? true;
              return (
                <div key={category} className="rounded-xl border border-white/10 bg-dark-900/50">
                  {/* Category Header */}
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 rounded-t-xl transition-colors"
                    onClick={() =>
                      setExpandedCategories((prev) => ({ ...prev, [category]: !isExpanded }))
                    }
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-white/30" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-white/30" />
                      )}
                      <span className="text-sm font-semibold text-white/70">
                        {CATEGORY_LABELS[category] || category}
                      </span>
                      <Badge color="gray" size="sm">
                        {tools.filter(([name]) => isToolEnabled(name)).length}/{tools.length}
                      </Badge>
                    </div>
                  </button>

                  {/* Tools List */}
                  {isExpanded && (
                    <div className="border-t border-white/5">
                      {tools.map(([name, info]) => {
                        const enabled = isToolEnabled(name);
                        const isPending = name in (pendingChanges[selectedPlatform] ?? []);

                        return (
                          <div
                            key={name}
                            className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors ${
                              !enabled ? "opacity-50" : ""
                            }`}
                          >
                            {/* Toggle */}
                            <button
                              onClick={() => toggleTool(name)}
                              className="flex-shrink-0"
                              title={enabled ? "Disable" : "Enable"}
                            >
                              {enabled ? (
                                <ToggleRight className="w-6 h-6 text-neon-orange" />
                              ) : (
                                <ToggleLeft className="w-6 h-6 text-white/20" />
                              )}
                            </button>

                            {/* Tool Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono text-white/80">{name}</span>
                                <Badge
                                  color={info.category === "core" ? "cyan" : info.category === "composite" ? "purple" : "gray"}
                                  size="sm"
                                >
                                  {info.category}
                                </Badge>
                              </div>
                              <p className="text-xs text-white/30">{info.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Info Banner */}
        <div className="mt-6 p-3 rounded-lg bg-dark-900/50 border border-white/5 flex items-start gap-2">
          <Info className="w-4 h-4 text-white/30 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-white/30">
            Changes take effect on next session start. Use <code className="text-orange-400/60">/reset</code> in chat to apply immediately.
            Tool changes are per-profile — each profile has independent tool configurations.
          </p>
        </div>
      </div>
    </div>
  );
}
