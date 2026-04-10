// ═══════════════════════════════════════════════════════════════
// Tools Manager — Configure toolsets per platform
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wrench,
  Check,
  ChevronDown,
  ChevronRight,
  Save,
  AlertCircle,
  Info,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface ToolsetInfo {
  label: string;
  description: string;
  category: "core" | "composite" | "platform";
}

interface ToolsData {
  available: Record<string, ToolsetInfo>;
  platformToolsets: Record<string, string[]>;
  activeToolsets: string[];
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

export default function ToolsPage() {
  const [data, setData] = useState<ToolsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [selectedPlatform, setSelectedPlatform] = useState("cli");
  const [pendingChanges, setPendingChanges] = useState<Record<string, string[]>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    core: true,
    platform: false,
  });

  useEffect(() => {
    fetch("/api/tools")
      .then((res) => res.json())
      .then((d) => setData(d.data))
      .finally(() => setLoading(false));
  }, []);

  const getCurrentToolsets = useCallback(() => {
    if (!data) return [];
    if (pendingChanges[selectedPlatform]) {
      return pendingChanges[selectedPlatform];
    }
    return data.platformToolsets[selectedPlatform] || [];
  }, [data, selectedPlatform, pendingChanges]);

  const toggleToolset = (toolset: string) => {
    const current = getCurrentToolsets();
    const next = current.includes(toolset)
      ? current.filter((t) => t !== toolset)
      : [...current, toolset];
    setPendingChanges((prev) => ({ ...prev, [selectedPlatform]: next }));
  };

  const handleSave = async () => {
    if (!data || Object.keys(pendingChanges).length === 0) return;
    setSaving(true);
    setSaveStatus("idle");

    try {
      for (const [platform, toolsets] of Object.entries(pendingChanges)) {
        const res = await fetch("/api/tools", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform, toolsets }),
        });
        if (!res.ok) throw new Error(`Failed to save ${platform}`);
      }
      setSaveStatus("saved");
      setPendingChanges({});
      // Reload
      const fresh = await fetch("/api/tools").then((r) => r.json());
      setData(fresh.data);
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  // Group toolsets by category
  const grouped: Record<string, Array<[string, ToolsetInfo]>> = { core: [], platform: [] };
  if (data) {
    for (const [key, info] of Object.entries(data.available)) {
      grouped[info.category]?.push([key, info]);
    }
  }

  const currentToolsets = getCurrentToolsets();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 grid-bg flex items-center justify-center">
        <LoadingSpinner text="Loading tools configuration..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 grid-bg">
      <PageHeader
        icon={Wrench}
        title="Tools Manager"
        subtitle="Configure which toolsets are available per platform"
        color="purple"
      />

      <div className="px-6 py-6">
        <div className="flex gap-6">
          {/* Platform Selector */}
          <div className="w-56 flex-shrink-0">
            <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-3">
              Platforms
            </h3>
            <div className="space-y-1">
              {PLATFORMS.map((platform) => {
                const toolsetCount =
                  pendingChanges[platform]?.length ??
                  data?.platformToolsets[platform]?.length ??
                  0;
                const hasPendingChanges = !!pendingChanges[platform];
                return (
                  <button
                    key={platform}
                    onClick={() => setSelectedPlatform(platform)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between ${
                      selectedPlatform === platform
                        ? "bg-neon-purple/10 text-neon-purple border border-neon-purple/20"
                        : "text-white/60 hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {PLATFORM_LABELS[platform] || platform}
                      {hasPendingChanges && (
                        <span className="w-1.5 h-1.5 rounded-full bg-neon-orange" />
                      )}
                    </span>
                    <span className="text-xs text-white/25 font-mono">
                      {toolsetCount}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Save Button */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  saveStatus === "saved"
                    ? "bg-green-500/20 text-neon-green border border-green-500/30"
                    : hasChanges
                    ? "bg-neon-purple/10 text-neon-purple border border-purple-500/30 hover:bg-neon-purple/20"
                    : "bg-white/5 text-white/30 border border-white/10"
                }`}
              >
                {saveStatus === "saved" ? (
                  <>
                    <Check className="w-4 h-4" /> Saved!
                  </>
                ) : saving ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                    {hasChanges && (
                      <span className="text-xs bg-neon-orange/20 text-neon-orange px-1.5 py-0.5 rounded">
                        {Object.keys(pendingChanges).length}
                      </span>
                    )}
                  </>
                )}
              </button>
              {saveStatus === "error" && (
                <p className="text-xs text-red-400 mt-2 text-center">
                  Save failed — check config permissions
                </p>
              )}
            </div>

            {/* Info Box */}
            <div className="mt-4 p-3 rounded-lg border border-cyan-500/10 bg-cyan-500/5">
              <div className="flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-neon-cyan mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-white/40 leading-relaxed">
                  Toolsets define what your agent can do on each platform. Core toolsets are individual capabilities. Platform toolsets are presets.
                </p>
              </div>
            </div>
          </div>

          {/* Toolsets List */}
          <div className="flex-1 min-w-0">
            <div className="rounded-xl border border-white/10 bg-dark-900/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 bg-dark-800/50 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    {PLATFORM_LABELS[selectedPlatform] || selectedPlatform}
                  </h2>
                  <p className="text-xs text-white/30 font-mono mt-0.5">
                    {currentToolsets.length} toolsets enabled
                  </p>
                </div>
                {pendingChanges[selectedPlatform] && (
                  <span className="text-[10px] font-mono text-neon-orange flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    modified
                  </span>
                )}
              </div>

              {Object.entries(grouped).map(([category, toolsets]) => (
                <div key={category}>
                  <button
                    onClick={() =>
                      setExpandedCategories((s) => ({
                        ...s,
                        [category]: !s[category],
                      }))
                    }
                    className="w-full flex items-center justify-between px-4 py-2 border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                      {category.charAt(0).toUpperCase() + category.slice(1)} Toolsets ({toolsets.length})
                    </span>
                    {expandedCategories[category] ? (
                      <ChevronDown className="w-3.5 h-3.5 text-white/20" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                    )}
                  </button>

                  {expandedCategories[category] && (
                    <div className="divide-y divide-white/5">
                      {toolsets.map(([key, info]) => {
                        const enabled = currentToolsets.includes(key);
                        return (
                          <div
                            key={key}
                            onClick={() => toggleToolset(key)}
                            className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer group"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-white/80 font-medium">
                                  {info.label}
                                </span>
                                <span className="text-[10px] font-mono text-white/20 bg-white/5 px-1.5 py-0.5 rounded">
                                  {key}
                                </span>
                              </div>
                              <p className="text-xs text-white/30 mt-0.5">
                                {info.description}
                              </p>
                            </div>
                            <div className="ml-4 flex-shrink-0">
                              {enabled ? (
                                <ToggleRight className="w-6 h-6 text-neon-green" />
                              ) : (
                                <ToggleLeft className="w-6 h-6 text-white/20 group-hover:text-white/40" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
