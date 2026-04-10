// ═══════════════════════════════════════════════════════════════
// Behaviour Page — CRUD for agent personality & behavior files
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Brain,
  FileText,
  Save,
  RotateCcw,
  Download,
  Eye,
  EyeOff,
  Code,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  FolderOpen,
  Clock,
  HardDrive,
  X,
  Shield,
  Key,
  Edit3,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import { LoadingSpinner, EmptyState } from "@/components/ui/LoadingSpinner";

interface BehaviorFile {
  key: string;
  name: string;
  description: string;
  category: string;
  path: string;
  exists: boolean;
  size: number;
  lastModified: string | null;
  content: string;
}

interface AgentsMdFile {
  path: string;
  directory: string;
  size: number;
  lastModified: string;
  content: string;
}

type EditorTarget =
  | { type: "behavior"; key: string }
  | { type: "agents-md"; path: string }
  | null;

export default function BehaviourPage() {
  const [files, setFiles] = useState<BehaviorFile[]>([]);
  const [agentsMdFiles, setAgentsMdFiles] = useState<AgentsMdFile[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor state
  const [editorTarget, setEditorTarget] = useState<EditorTarget>(null);
  const [editorContent, setEditorContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [previewMode, setPreviewMode] = useState(false);

  // Sections expanded state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    identity: true,
    user: true,
    system: false,
    "agents-md": true,
    env: false,
  });

  // Environment variables state
  const [envEntries, setEnvEntries] = useState<Array<{ key: string; value: string; masked: string; sensitive: boolean; isComment: boolean; isEmpty: boolean }>>([]);
  const [envRevealed, setEnvRevealed] = useState<Set<string>>(new Set());
  const [envEditing, setEnvEditing] = useState<string | null>(null);
  const [envEditValue, setEnvEditValue] = useState("");
  const [envSaving, setEnvSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [filesRes, agentsRes, envRes] = await Promise.all([
        fetch("/api/agent/files"),
        fetch("/api/agent/agents-md"),
        fetch("/api/agent/env"),
      ]);
      const filesData = await filesRes.json();
      const agentsData = await agentsRes.json();
      const envData = await envRes.json();
      setFiles(filesData.data?.files || filesData.files || []);
      setAgentsMdFiles(agentsData.data?.files || agentsData.files || []);
      setEnvEntries(envData.data?.entries || envData.entries || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const handleEnvSave = async (key: string) => {
    setEnvSaving(true);
    try {
      const res = await fetch("/api/agent/env", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: envEditValue }),
      });
      if (res.ok) {
        setEnvEditing(null);
        loadData();
      }
    } catch {
      // ignore
    } finally {
      setEnvSaving(false);
    }
  };

  const toggleEnvReveal = (key: string) => {
    setEnvRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openEditor = (target: EditorTarget, content: string) => {
    setEditorTarget(target);
    setEditorContent(content);
    setOriginalContent(content);
    setPreviewMode(false);
    setSaveStatus("idle");
  };

  const handleSave = async () => {
    if (!editorTarget) return;
    setSaving(true);
    setSaveStatus("saving");
    try {
      let res: Response;
      if (editorTarget.type === "behavior") {
        res = await fetch(`/api/agent/files/${editorTarget.key}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: editorContent, backup: true }),
        });
      } else {
        res = await fetch("/api/agent/agents-md", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: editorTarget.path, content: editorContent, backup: true }),
        });
      }
      if (!res.ok) throw new Error("Save failed");
      setOriginalContent(editorContent);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      // Reload to get updated file metadata
      loadData();
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setEditorContent(originalContent);
  };

  const handleDownload = () => {
    const fileName =
      editorTarget?.type === "behavior"
        ? files.find((f) => f.key === editorTarget.key)?.name || "file.md"
        : "AGENTS.md";
    const blob = new Blob([editorContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasChanges = editorContent !== originalContent;

  const groupedFiles: Record<string, BehaviorFile[]> = {};
  for (const f of files) {
    if (!groupedFiles[f.category]) groupedFiles[f.category] = [];
    groupedFiles[f.category].push(f);
  }

  const categoryLabels: Record<string, string> = {
    identity: "Identity & Persona",
    user: "User & Memory",
    system: "System",
  };

  const categoryColors: Record<string, string> = {
    identity: "cyan",
    user: "pink",
    system: "orange",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 grid-bg flex items-center justify-center">
        <LoadingSpinner text="Loading behaviour files..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 grid-bg">
      <PageHeader
        icon={Brain}
        title="Agent Behaviour"
        subtitle="Edit the markdown files that define your agent's personality, memory, and behaviour"
        color="cyan"
      />

      <div className="px-6 py-6">
        <div className="flex gap-6">
          {/* File List Panel */}
          <div className="w-80 flex-shrink-0 space-y-4">
            {/* Static Behavior Files */}
            {Object.entries(groupedFiles).map(([category, catFiles]) => (
              <div
                key={category}
                className="rounded-xl border border-white/10 bg-dark-900/50 overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedSections((s) => ({ ...s, [category]: !s[category] }))
                  }
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        categoryColors[category] === "cyan"
                          ? "bg-neon-cyan"
                          : categoryColors[category] === "pink"
                          ? "bg-neon-pink"
                          : "bg-neon-orange"
                      }`}
                    />
                    <span className="text-xs font-mono text-white/60 uppercase tracking-wider">
                      {categoryLabels[category] || category}
                    </span>
                    <span className="text-[10px] font-mono text-white/25">
                      ({catFiles.length})
                    </span>
                  </div>
                  {expandedSections[category] ? (
                    <ChevronDown className="w-3.5 h-3.5 text-white/30" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-white/30" />
                  )}
                </button>

                {expandedSections[category] && (
                  <div className="border-t border-white/5 divide-y divide-white/5">
                    {catFiles.map((file) => {
                      const isActive =
                        editorTarget?.type === "behavior" &&
                        editorTarget.key === file.key;
                      return (
                        <button
                          key={file.key}
                          onClick={() => openEditor({ type: "behavior", key: file.key }, file.content)}
                          className={`w-full text-left px-4 py-3 transition-colors ${
                            isActive
                              ? "bg-neon-cyan/5 border-l-2 border-l-neon-cyan"
                              : "hover:bg-white/[0.02] border-l-2 border-l-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <FileText
                              className={`w-3.5 h-3.5 ${
                                isActive ? "text-neon-cyan" : "text-white/30"
                              }`}
                            />
                            <span
                              className={`text-sm font-medium ${
                                isActive ? "text-white" : "text-white/70"
                              }`}
                            >
                              {file.name}
                            </span>
                            {!file.exists && (
                              <span className="text-[10px] font-mono text-neon-orange">
                                NEW
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-white/30 mt-0.5 ml-5 line-clamp-1">
                            {file.description}
                          </p>
                          {file.exists && (
                            <div className="flex items-center gap-3 mt-1 ml-5 text-[10px] text-white/20 font-mono">
                              <span>{(file.size / 1024).toFixed(1)} KB</span>
                              {file.lastModified && (
                                <span>
                                  {new Date(file.lastModified).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* AGENTS.md Files Section */}
            <div className="rounded-xl border border-white/10 bg-dark-900/50 overflow-hidden">
              <button
                onClick={() =>
                  setExpandedSections((s) => ({
                    ...s,
                    "agents-md": !s["agents-md"],
                  }))
                }
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-neon-green" />
                  <span className="text-xs font-mono text-white/60 uppercase tracking-wider">
                    AGENTS.md
                  </span>
                  <span className="text-[10px] font-mono text-white/25">
                    ({agentsMdFiles.length})
                  </span>
                </div>
                {expandedSections["agents-md"] ? (
                  <ChevronDown className="w-3.5 h-3.5 text-white/30" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-white/30" />
                )}
              </button>

              {expandedSections["agents-md"] && (
                <div className="border-t border-white/5 divide-y divide-white/5">
                  {agentsMdFiles.length === 0 ? (
                    <div className="px-4 py-4 text-center text-xs text-white/30">
                      No AGENTS.md files found
                    </div>
                  ) : (
                    agentsMdFiles.map((file) => {
                      const isActive =
                        editorTarget?.type === "agents-md" &&
                        editorTarget.path === file.path;
                      return (
                        <button
                          key={file.path}
                          onClick={() =>
                            openEditor(
                              { type: "agents-md", path: file.path },
                              file.content
                            )
                          }
                          className={`w-full text-left px-4 py-3 transition-colors ${
                            isActive
                              ? "bg-neon-green/5 border-l-2 border-l-neon-green"
                              : "hover:bg-white/[0.02] border-l-2 border-l-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <FolderOpen
                              className={`w-3.5 h-3.5 ${
                                isActive ? "text-neon-green" : "text-white/30"
                              }`}
                            />
                            <span
                              className={`text-sm font-medium ${
                                isActive ? "text-white" : "text-white/70"
                              }`}
                            >
                              AGENTS.md
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 ml-5 text-[10px] text-white/25 font-mono">
                            <span className="truncate">{file.directory}</span>
                            <span>{(file.size / 1024).toFixed(1)} KB</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Environment Variables Section */}
          <div className="rounded-xl border border-white/10 bg-dark-900/50 overflow-hidden mt-4">
            <button
              onClick={() => setExpandedSections((s) => ({ ...s, env: !s.env }))}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-neon-orange" />
                <span className="text-xs font-mono text-white/60 uppercase tracking-wider">
                  Environment Variables
                </span>
                <span className="text-[10px] font-mono text-white/25">
                  ({envEntries.filter((e) => !e.isComment && !e.isEmpty).length})
                </span>
              </div>
              {expandedSections.env ? (
                <ChevronDown className="w-3.5 h-3.5 text-white/30" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-white/30" />
              )}
            </button>

            {expandedSections.env && (
              <div className="border-t border-white/5 divide-y divide-white/5 max-h-96 overflow-y-auto">
                {envEntries
                  .filter((e) => !e.isComment && !e.isEmpty && e.key)
                  .map((entry) => (
                    <div key={entry.key} className="px-4 py-2 flex items-center justify-between group hover:bg-white/[0.02]">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Key className="w-3 h-3 text-white/20 flex-shrink-0" />
                        <span className="text-xs font-mono text-white/60 truncate">{entry.key}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {envEditing === entry.key ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={envEditValue}
                              onChange={(e) => setEnvEditValue(e.target.value)}
                              className="w-40 bg-dark-800/50 border border-white/20 rounded px-2 py-1 text-xs font-mono text-white outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleEnvSave(entry.key)}
                              disabled={envSaving}
                              className="p-1 rounded text-neon-green hover:bg-green-500/10"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEnvEditing(null)}
                              className="p-1 rounded text-white/30 hover:text-white/60"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-xs font-mono text-white/30">
                              {entry.sensitive
                                ? (envRevealed.has(entry.key) ? entry.masked : "••••••")
                                : entry.masked || "(empty)"}
                            </span>
                            {entry.sensitive && entry.value && (
                              <button
                                onClick={() => toggleEnvReveal(entry.key)}
                                className="p-1 rounded text-white/20 hover:text-white/40 opacity-0 group-hover:opacity-100 transition-opacity"
                                title={envRevealed.has(entry.key) ? "Hide" : "Show masked"}
                              >
                                {envRevealed.has(entry.key) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            )}
                            <button
                              onClick={() => { setEnvEditing(entry.key); setEnvEditValue(entry.value); }}
                              className="p-1 rounded text-white/20 hover:text-neon-cyan opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Edit"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Editor Panel */}
          <div className="flex-1 min-w-0">
            {!editorTarget ? (
              <div className="rounded-xl border border-white/10 bg-dark-900/50 p-12 text-center">
                <Brain className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white/60 mb-2">
                  Select a File to Edit
                </h3>
                <p className="text-sm text-white/30 max-w-md mx-auto">
                  Choose a behaviour file from the left panel to view and edit its
                  contents. These markdown files define your agent's personality,
                  memory, and behavioural guidelines.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-dark-900/50 overflow-hidden glow-cyan">
                {/* Editor Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-dark-800/50">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <span className="text-xs text-white/40 font-mono">
                      {editorTarget.type === "behavior"
                        ? files.find((f) => f.key === editorTarget.key)?.name
                        : `AGENTS.md — ${
                            agentsMdFiles.find((a) => a.path === editorTarget.path)
                              ?.directory
                          }`}
                      {" — "}
                      {editorContent.split("\n").length} lines
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasChanges && (
                      <span className="text-xs text-neon-orange font-mono flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        UNSAVED
                      </span>
                    )}
                    <button
                      onClick={() => setPreviewMode(!previewMode)}
                      className="text-xs font-mono text-white/40 hover:text-white/60 px-2 py-1 rounded border border-white/10 hover:border-white/20 transition-colors"
                    >
                      {previewMode ? "Edit" : "Preview"}
                    </button>
                    <button
                      onClick={handleReset}
                      disabled={!hasChanges}
                      className="text-xs font-mono text-white/40 hover:text-white/60 px-2 py-1 rounded border border-white/10 hover:border-white/20 transition-colors disabled:opacity-30"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleDownload}
                      className="text-xs font-mono text-white/40 hover:text-white/60 px-2 py-1 rounded border border-white/10 hover:border-white/20 transition-colors"
                    >
                      Export
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!hasChanges || saving}
                      className={`text-xs font-mono px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
                        saveStatus === "saved"
                          ? "bg-green-500/20 text-neon-green border border-green-500/30"
                          : hasChanges
                          ? "bg-neon-cyan/10 text-neon-cyan border border-cyan-500/30 hover:bg-neon-cyan/20"
                          : "bg-white/5 text-white/30 border border-white/10"
                      }`}
                    >
                      {saveStatus === "saving" ? (
                        "Saving..."
                      ) : saveStatus === "saved" ? (
                        <>
                          <Check className="w-3 h-3" /> Saved!
                        </>
                      ) : (
                        <>
                          <Save className="w-3 h-3" /> Save
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setEditorTarget(null)}
                      className="text-white/30 hover:text-white/60 ml-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Content Area */}
                <div className="h-[calc(100vh-260px)] overflow-auto">
                  {previewMode ? (
                    <div className="p-6">
                      <pre className="whitespace-pre-wrap font-sans text-white/80 leading-relaxed text-sm">
                        {editorContent}
                      </pre>
                    </div>
                  ) : (
                    <div className="flex h-full">
                      {/* Line Numbers */}
                      <div className="flex-shrink-0 w-12 bg-dark-800/30 border-r border-white/5 py-4 select-none">
                        {editorContent.split("\n").map((_, i) => (
                          <div
                            key={i}
                            className="text-right pr-2 text-xs font-mono text-white/20 leading-6"
                          >
                            {i + 1}
                          </div>
                        ))}
                      </div>
                      {/* Editor */}
                      <textarea
                        value={editorContent}
                        onChange={(e) => setEditorContent(e.target.value)}
                        className="flex-1 bg-transparent text-white/80 font-mono text-sm leading-6 p-4 resize-none outline-none placeholder-white/20"
                        placeholder="Start editing..."
                        spellCheck={false}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
