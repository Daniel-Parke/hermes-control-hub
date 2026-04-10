// ═══════════════════════════════════════════════════════════════
// Dashboard — Mission Control Home (Redesigned)
// ═══════════════════════════════════════════════════════════════
// Lean operational overview. No nav cards, no fake terminals.
// One-glance situational awareness → one-click actions.

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Cpu,
  HardDrive,
  Activity,
  Layers,
  ListTodo,
  Globe,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Pause,
  Play,
  Bot,
  Radio,
  Rocket,
  ChevronRight,
  Clock,
  Loader2,
  XCircle,
  Zap,
  Search,
  Bug,
  GitPullRequest,
  Wrench,
  PenTool,
  Shield,
  Terminal,
  Database,
  Code,
  FileText,
} from "lucide-react";
import Card, { StatusDot } from "@/components/ui/Card";
import type { SystemStatus, AccentColor } from "@/types/hermes";
import { timeAgo, timeUntil } from "@/lib/utils";

interface AgentRun {
  id: string;
  type: "cron" | "gateway" | "manual" | "subagent";
  name: string;
  status: "running" | "idle";
  startedAt: string | null;
  lastActivity: string | null;
  model: string;
  pid: number | null;
  turns: number;
}

interface MissionBrief {
  id: string;
  name: string;
  status: string;
  dispatchMode: string;
  createdAt: string;
  goals: string[];
  cronJobId?: string;
  cronJob?: { state: string; enabled: boolean; lastRun: string | null; lastStatus: string | null };
}

// ── Simple 3-Step Progress Indicator ─────────────────────────
// States: Queued → Working → Done
function MissionProgress({
  status,
  cronState,
  dispatchMode,
}: {
  status: string;
  cronState?: string;
  dispatchMode?: string;
}) {
  const steps: Array<{ label: string; state: "done" | "active" | "pending" | "failed" }> = [
    { label: dispatchMode === "cron" ? "Queued" : "Dispatched", state: "pending" },
    { label: "Processing", state: "pending" },
    { label: "Done", state: "pending" },
  ];

  if (status === "completed") {
    steps[0].state = "done";
    steps[1].state = "done";
    steps[2].state = "done";
  } else if (status === "failed") {
    steps[0].state = "done";
    steps[1].state = "failed";
    steps[2].state = "failed";
  } else if (status === "running" || cronState === "active" || cronState === "running") {
    steps[0].state = "done";
    steps[1].state = "active";
  } else {
    // dispatched / queued / scheduled
    steps[0].state = "active";
  }

  return (
    <div className="flex items-center gap-1.5">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-1.5">
          {i > 0 && (
            <div className={`w-4 h-px ${
              steps[i - 1].state === "done" ? "bg-white/25" :
              steps[i - 1].state === "active" ? "bg-neon-cyan/30" :
              steps[i - 1].state === "failed" ? "bg-red-400/30" :
              "bg-white/10"
            }`} />
          )}
          <div
            className={`w-3 h-3 rounded-full flex items-center justify-center ${
              step.state === "done"
                ? "bg-neon-green/20 border border-neon-green/50"
                : step.state === "active"
                ? "bg-neon-cyan/20 border border-neon-cyan/50 animate-pulse"
                : step.state === "failed"
                ? "bg-red-500/20 border border-red-500/50"
                : "bg-white/5 border border-white/10"
            }`}
            title={step.label}
          >
            {step.state === "done" && <div className="w-1.5 h-1.5 rounded-full bg-neon-green" />}
            {step.state === "active" && <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />}
            {step.state === "failed" && <div className="w-1.5 h-1.5 rounded-full bg-red-400" />}
          </div>
        </div>
      ))}
    </div>
  );
}

interface CronJob {
  id: string;
  name: string;
  state: string;
  enabled: boolean;
  schedule: string;
  lastRun: string | null;
  nextRun: string | null;
  lastStatus: string | null;
}

interface MonitorData {
  cron: { total: number; active: number; paused: number; jobs: CronJob[] };
  sessions: { total: number; recent: Array<{ id: string; modified: string; size: number }> };
  gateway: { platforms: Record<string, boolean>; connectedCount: number };
  memory: { factCount: number; dbSize: string; provider: string };
  errors: Array<{ source: string; message: string; timestamp: string }>;
  system: { lastCronRun: string | null; lastCronStatus: string | null };
}

function CronStatusBadge({ state, enabled }: { state: string; enabled: boolean }) {
  if (!enabled) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/5 text-white/40">
        <Pause className="w-2.5 h-2.5" /> paused
      </span>
    );
  }
  if (state === "scheduled") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-green-500/10 text-neon-green">
        <Play className="w-2.5 h-2.5" /> active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/5 text-white/40">
      {state}
    </span>
  );
}

// ── Compact Stat Pill ─────────────────────────────────────────
function StatPill({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: AccentColor;
}) {
  const colorClasses: Record<AccentColor, string> = {
    cyan: "border-cyan-500/20 text-neon-cyan",
    purple: "border-purple-500/20 text-neon-purple",
    green: "border-green-500/20 text-neon-green",
    pink: "border-pink-500/20 text-neon-pink",
    orange: "border-orange-500/20 text-neon-orange",
  };
  return (
    <div className={`rounded-lg border ${colorClasses[color]} bg-dark-900/50 px-4 py-3 flex items-center gap-3`}>
      <Icon className="w-4 h-4 opacity-60" />
      <div>
        <div className="text-[10px] font-mono text-white/40 uppercase">{label}</div>
        <div className="text-lg font-bold font-mono">{value}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [monitor, setMonitor] = useState<MonitorData | null>(null);
  const [agents, setAgents] = useState<AgentRun[]>([]);
  const [missions, setMissions] = useState<MissionBrief[]>([]);
  const [time, setTime] = useState<Date | null>(null);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; icon: string; color: string; isCustom?: boolean }>>([]);

  useEffect(() => {
    setTime(new Date());
    const clockInterval = setInterval(() => setTime(new Date()), 1000);

    fetch("/api/status").then((r) => r.json()).then(setStatus).catch(() => setStatus(null));
    fetch("/api/config").then((r) => r.json()).then(setConfig).catch(() => setConfig(null));
    fetch("/api/missions?action=templates").then((r) => r.json()).then((d) => setTemplates(d.data?.templates || [])).catch(() => setTemplates([]));

    const refreshMonitor = () => {
      fetch("/api/monitor").then((r) => r.json()).then(setMonitor).catch(() => setMonitor(null));
      fetch("/api/agents").then((r) => r.json()).then((d) => setAgents(d.agents || [])).catch(() => setAgents([]));
      fetch("/api/missions").then((r) => r.json()).then((d) => setMissions(d.data?.missions || [])).catch(() => setMissions([]));
    };
    refreshMonitor();
    const monitorInterval = setInterval(refreshMonitor, 15000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(monitorInterval);
    };
  }, []);

  const modelConfig = config?.model as Record<string, unknown> | undefined;
  const currentModel = (modelConfig?.default as string) || "—";
  const currentProvider = (modelConfig?.provider as string) || "";
  const activeAgents = agents.filter((a) => a.status === "running");

  return (
    <div className="min-h-screen bg-dark-950 grid-bg relative scanlines">
      {/* Top Bar */}
      <div className="border-b border-white/10 bg-dark-900/50 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-neon-cyan text-glow-cyan">MISSION</span>
            <span className="text-white/40 mx-1">/</span>
            <span className="text-white">CONTROL</span>
          </h1>
          <p className="text-xs text-white/40 font-mono">
            {currentModel}{currentProvider ? ` · ${currentProvider}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-sm font-mono text-neon-cyan" suppressHydrationWarning>
              {time ? time.toLocaleTimeString("en-US", { hour12: false }) : "--:--:--"}
            </div>
            <div className="text-xs text-white/40" suppressHydrationWarning>
              {time
                ? time.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
                : "---"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-neon-green pulse-glow" />
            <span className="text-xs text-white/60 font-mono">ONLINE</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* ═══ Compact Stat Row ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatPill
            icon={Bot}
            label="Agents"
            value={activeAgents.length > 0 ? `${activeAgents.length} active` : status?.soulFile ? "idle" : "offline"}
            color={activeAgents.length > 0 ? "green" : status?.soulFile ? "cyan" : "pink"}
          />
          <StatPill
            icon={ListTodo}
            label="Cron Jobs"
            value={monitor ? `${monitor.cron.active} active` : "..."}
            color="orange"
          />
          <StatPill
            icon={Activity}
            label="Sessions"
            value={monitor ? `${monitor.sessions.total}` : status ? `${status.sessionsCount}` : "..."}
            color="purple"
          />
          <StatPill
            icon={Layers}
            label={`Memory · ${monitor?.memory.provider || "holographic"}`}
            value={monitor ? `${monitor.memory.factCount} facts` : "..."}
            color="pink"
          />
        </div>

        {/* ═══ Mission Dispatch Quick Launch ═══ */}
        <div className="rounded-xl border border-cyan-500/20 bg-dark-900/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-neon-cyan" />
              <span className="text-sm font-mono text-white/80">Mission Dispatch</span>
            </div>
            <Link
              href="/missions"
              className="text-[10px] font-mono text-neon-cyan hover:underline flex items-center gap-1"
            >
              full control <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-xs text-white/30 mb-3">
            Dispatch a mission to your agent fleet. Choose a template or write your own prompt.
          </p>
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => {
              const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
                Search, Bug, GitPullRequest, Wrench, PenTool, Zap,
                Rocket, Cpu, Activity, Shield, Terminal, Database,
                Globe, Code, FileText, Layers, HardDrive, AlertTriangle,
              };
              const Icon = iconMap[t.icon] || Zap;
              return (
                <Link
                  key={t.id}
                  href={`/missions?template=${t.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white/60 hover:border-white/30 hover:text-white transition-colors"
                >
                  <Icon className="w-3 h-3" />
                  {t.name}
                </Link>
              );
            })}
            {templates.length === 0 && (
              <Link
                href="/missions"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white/60 hover:border-white/30 hover:text-white transition-colors"
              >
                <Rocket className="w-3 h-3" />
                New Mission
              </Link>
            )}
          </div>
        </div>

        {/* ═══ Active Missions ═══ */}
        {missions.filter((m) => m.status === "dispatched" || m.status === "running").length > 0 && (
          <div className="rounded-xl border border-cyan-500/20 bg-dark-900/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-dark-800/50">
              <div className="flex items-center gap-2">
                <Rocket className="w-3.5 h-3.5 text-neon-cyan" />
                <span className="text-xs font-mono text-white/60">Active Missions</span>
                <span className="text-[10px] font-mono text-white/25">
                  ({missions.filter((m) => m.status === "dispatched" || m.status === "running").length})
                </span>
              </div>
              <Link href="/missions" className="text-[10px] font-mono text-neon-cyan hover:underline flex items-center gap-1">
                all missions <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-white/5">
              {missions
                .filter((m) => m.status === "dispatched" || m.status === "running")
                .map((m) => (
                  <Link key={m.id} href="/missions" className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <StatusDot
                        status={m.status === "running" ? "online" : "warning"}
                        pulse={m.status === "running"}
                      />
                      <span className="text-xs text-white/80 truncate">{m.name}</span>
                      <span className="text-[10px] font-mono text-white/30 capitalize">{m.dispatchMode}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <MissionProgress
                        status={m.status}
                        cronState={m.cronJob?.state}
                        dispatchMode={m.dispatchMode}
                      />
                      {m.cronJob?.lastRun && (
                        <span className="text-[10px] font-mono text-white/25">{timeAgo(m.cronJob.lastRun)}</span>
                      )}
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        )}

        {/* ═══ Three-Panel System Monitor ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Cron Jobs Panel */}
          <div className="rounded-xl border border-orange-500/20 bg-dark-900/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-dark-800/50">
              <div className="flex items-center gap-2">
                <ListTodo className="w-3.5 h-3.5 text-neon-orange" />
                <span className="text-xs font-mono text-white/60">Cron Jobs</span>
              </div>
              <Link href="/cron" className="text-[10px] font-mono text-neon-orange hover:underline">
                manage →
              </Link>
            </div>
            <div className="divide-y divide-white/5">
              {monitor?.cron.jobs.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-white/30">No cron jobs</div>
              )}
              {monitor?.cron.jobs.map((job) => (
                <div key={job.id} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-white/80 truncate">{job.name}</div>
                    <div className="text-[10px] text-white/30 font-mono mt-0.5">
                      {job.schedule}
                      {job.enabled && (
                        <span className={`ml-2 ${
                          job.state === "running"
                            ? "text-neon-green"
                            : job.lastStatus === "ok"
                            ? "text-neon-green"
                            : job.lastStatus && job.lastStatus !== "ok"
                            ? "text-red-400"
                            : "text-neon-orange"
                        }`}>
                          {job.state === "running"
                            ? "executing..."
                            : job.lastRun && !job.nextRun
                            ? `${job.lastStatus || "done"} ${timeAgo(job.lastRun)}`
                            : job.nextRun && new Date(job.nextRun).getTime() > Date.now()
                            ? "next " + timeUntil(job.nextRun)
                            : job.lastRun
                            ? `active · ran ${timeAgo(job.lastRun)}`
                            : "queued"}
                        </span>
                      )}
                    </div>
                  </div>
                  <CronStatusBadge state={job.state} enabled={job.enabled} />
                </div>
              ))}
            </div>
          </div>

          {/* Platforms Panel */}
          <div className="rounded-xl border border-cyan-500/20 bg-dark-900/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-dark-800/50">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-neon-cyan" />
                <span className="text-xs font-mono text-white/60">Platforms</span>
              </div>
              <Link href="/gateway" className="text-[10px] font-mono text-neon-cyan hover:underline">
                details →
              </Link>
            </div>
            <div className="px-4 py-3 space-y-2">
              {monitor
                ? Object.entries(monitor.gateway.platforms).map(([platform, connected]) => (
                    <div key={platform} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusDot status={connected ? "online" : "idle"} pulse={connected} />
                        <span className="text-xs text-white/70 capitalize">{platform}</span>
                      </div>
                      <span className={`text-[10px] font-mono ${connected ? "text-neon-green" : "text-white/25"}`}>
                        {connected ? "connected" : "disabled"}
                      </span>
                    </div>
                  ))
                : ["discord", "telegram", "slack", "whatsapp"].map((p) => (
                    <div key={p} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusDot status="idle" />
                        <span className="text-xs text-white/70 capitalize">{p}</span>
                      </div>
                      <span className="text-[10px] font-mono text-white/25">...</span>
                    </div>
                  ))}
              {monitor && monitor.gateway.connectedCount === 0 && (
                <div className="text-[10px] text-white/30 text-center py-2">No platforms configured</div>
              )}
            </div>
            {monitor?.system.lastCronRun && (
              <div className="px-4 py-2 border-t border-white/10">
                <div className="text-[10px] text-white/30 font-mono flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Last cron: {timeAgo(monitor.system.lastCronRun)}
                  {monitor.system.lastCronStatus && (
                    <span className={monitor.system.lastCronStatus === "ok" ? "text-neon-green" : "text-red-400"}>
                      {monitor.system.lastCronStatus === "ok" ? "✓" : "✗"}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Errors Panel */}
          <div className="rounded-xl border border-red-500/20 bg-dark-900/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-dark-800/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs font-mono text-white/60">Errors</span>
              </div>
              <Link href="/logs" className="text-[10px] font-mono text-red-400 hover:underline">
                logs →
              </Link>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {monitor?.errors.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <CheckCircle2 className="w-5 h-5 text-neon-green mx-auto mb-1" />
                  <div className="text-xs text-neon-green">No recent errors</div>
                </div>
              )}
              {monitor?.errors.map((err, i) => (
                <div key={i} className="px-4 py-2 border-b border-white/5 last:border-0">
                  <div className="text-[10px] text-red-400/80 font-mono truncate">{err.message}</div>
                  <div className="text-[10px] text-white/20 font-mono mt-0.5">
                    {err.source} {err.timestamp && `· ${err.timestamp}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ Running Agents ═══ */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-mono text-white/40 uppercase tracking-widest flex items-center gap-2">
              <Bot className="w-3 h-3 text-neon-purple" />
              Running Agents
              <span className="text-[10px] text-white/25 ml-1">({activeAgents.length} active)</span>
            </h2>
            <RefreshCw
              className="w-3 h-3 text-white/20 hover:text-white/50 cursor-pointer"
              onClick={() => fetch("/api/agents").then((r) => r.json()).then((d) => setAgents(d.agents || []))}
            />
          </div>
          {agents.length === 0 ? (
            <div className="rounded-xl border border-purple-500/20 bg-dark-900/50 p-6 text-center">
              <Bot className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <div className="text-xs text-white/30">No active agents detected</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {agents.map((agent) => (
                <div key={agent.id} className="rounded-xl border border-purple-500/20 bg-dark-900/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Radio className={`w-4 h-4 ${agent.status === "running" ? "text-neon-green pulse-glow" : "text-white/30"}`} />
                      <span className="text-sm text-white/90 font-medium truncate">{agent.name}</span>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      agent.status === "running" ? "bg-green-500/10 text-neon-green" : "bg-white/5 text-white/30"
                    }`}>
                      {agent.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-[10px] font-mono text-white/40">
                    <div className="flex justify-between">
                      <span>Type</span>
                      <span className="text-white/60 capitalize">{agent.type}</span>
                    </div>
                    {agent.model !== "unknown" && agent.model !== "gateway" && (
                      <div className="flex justify-between">
                        <span>Model</span>
                        <span className="text-white/60">{agent.model}</span>
                      </div>
                    )}
                    {agent.turns > 0 && (
                      <div className="flex justify-between">
                        <span>Turns</span>
                        <span className="text-white/60">{agent.turns}</span>
                      </div>
                    )}
                    {agent.lastActivity && (
                      <div className="flex justify-between">
                        <span>Last activity</span>
                        <span className="text-white/60">{timeAgo(agent.lastActivity)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
