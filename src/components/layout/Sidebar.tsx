// ═══════════════════════════════════════════════════════════════
// Sidebar Navigation — Config Settings with categorized groups
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Terminal,
  Brain,
  Settings,
  FileText,
  Database,
  Clock,
  Shield,
  Zap,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Menu,
  Cpu,
  Activity,
  Layers,
  HardDrive,
  Wrench,
  ListTodo,
  Globe,
  ScrollText,
  Sparkles,
  Rocket,
  Volume2,
  Mic,
  GitBranch,
  RotateCcw,
  ShieldCheck,
  MessageSquare,
  Lock,
  Code,
  RefreshCw,
  AlertTriangle,
  Check,
  Download,
} from "lucide-react";
import type { AccentColor } from "@/types/hermes";
import { iconColorMap } from "@/lib/theme";

interface SidebarLink {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  color: AccentColor;
}

interface SidebarSection {
  label: string;
  links: SidebarLink[];
}

interface ConfigGroup {
  label: string;
  defaultOpen?: boolean;
  links: SidebarLink[];
}

const mainSections: SidebarSection[] = [
  {
    label: "Main",
    links: [
      { icon: Zap, label: "Dashboard", href: "/", color: "cyan" },
      { icon: Rocket, label: "Missions", href: "/missions", color: "cyan" },
      { icon: ListTodo, label: "Cron", href: "/cron", color: "orange" },
      { icon: Clock, label: "Sessions", href: "/sessions", color: "orange" },
      { icon: Database, label: "Memory", href: "/memory", color: "pink" },
      { icon: Globe, label: "Gateway", href: "/gateway", color: "cyan" },
      { icon: ScrollText, label: "Logs", href: "/logs", color: "cyan" },
    ],
  },
  {
    label: "Agent",
    links: [
      { icon: Brain, label: "Behaviour", href: "/agent/behaviour", color: "cyan" },
      { icon: FileText, label: "Skills", href: "/skills", color: "green" },
      { icon: Wrench, label: "Tools", href: "/agent/tools", color: "purple" },
      { icon: Sparkles, label: "Personalities", href: "/personalities", color: "purple" },
    ],
  },
];

const configGroups: ConfigGroup[] = [
  {
    label: "Core",
    defaultOpen: true,
    links: [
      { icon: Cpu, label: "Agent", href: "/config/agent", color: "cyan" },
      { icon: Globe, label: "Model", href: "/config/model", color: "purple" },
      { icon: Activity, label: "Display", href: "/config/display", color: "green" },
      { icon: Layers, label: "Memory", href: "/config/memory", color: "pink" },
    ],
  },
  {
    label: "Infrastructure",
    links: [
      { icon: Terminal, label: "Terminal", href: "/config/terminal", color: "orange" },
      { icon: HardDrive, label: "Compression", href: "/config/compression", color: "cyan" },
      { icon: Globe, label: "Browser", href: "/config/browser", color: "green" },
      { icon: Zap, label: "Checkpoints", href: "/config/checkpoints", color: "cyan" },
      { icon: Code, label: "Code Execution", href: "/config/code_execution", color: "green" },
      { icon: ScrollText, label: "Logging", href: "/config/logging", color: "green" },
    ],
  },
  {
    label: "Security",
    links: [
      { icon: Shield, label: "Security", href: "/config/security", color: "cyan" },
      { icon: Lock, label: "Privacy", href: "/config/privacy", color: "cyan" },
      { icon: ShieldCheck, label: "Approvals", href: "/config/approvals", color: "purple" },
    ],
  },
  {
    label: "Voice & Audio",
    links: [
      { icon: Volume2, label: "Text-to-Speech", href: "/config/tts", color: "pink" },
      { icon: Mic, label: "Speech-to-Text", href: "/config/stt", color: "purple" },
      { icon: Mic, label: "Voice", href: "/config/voice", color: "pink" },
    ],
  },
  {
    label: "Automation",
    links: [
      { icon: GitBranch, label: "Delegation", href: "/config/delegation", color: "green" },
      { icon: ListTodo, label: "Cron", href: "/config/cron", color: "orange" },
      { icon: RotateCcw, label: "Session Reset", href: "/config/session_reset", color: "orange" },
      { icon: FileText, label: "Skills", href: "/config/skills", color: "green" },
    ],
  },
  {
    label: "Integrations",
    links: [
      { icon: MessageSquare, label: "Discord", href: "/config/discord", color: "purple" },
      { icon: Globe, label: "Web", href: "/config/web", color: "green" },
      { icon: Cpu, label: "Auxiliary Models", href: "/config/auxiliary", color: "cyan" },
      { icon: Wrench, label: "Platform Toolsets", href: "/config/platform_toolsets", color: "purple" },
      { icon: GitBranch, label: "Smart Routing", href: "/config/smart_model_routing", color: "purple" },
      { icon: Clock, label: "Human Delay", href: "/config/human_delay", color: "orange" },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

// ── Version Check & Update ───────────────────────────────────

interface VersionInfo {
  localHash: string;
  remoteHash: string;
  updateAvailable: boolean;
  commitMessage: string;
  behind: number;
  branch: string;
  lastChecked: string;
}

function VersionFooter({ collapsed }: { collapsed: boolean }) {
  const [version, setVersion] = useState<VersionInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const checkVersion = useCallback(async () => {
    setChecking(true);
    setMessage(null);
    try {
      const res = await fetch("/api/update");
      const d = await res.json();
      if (d.data) setVersion(d.data);
    } catch {
      setMessage("Check failed");
    } finally {
      setChecking(false);
    }
  }, []);

  // Auto-check on mount
  useEffect(() => {
    checkVersion();
  }, [checkVersion]);

  const handleUpdate = async () => {
    if (updating) return;
    setUpdating(true);
    setMessage("Updating...");
    try {
      const res = await fetch("/api/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update" }),
      });
      const d = await res.json();
      if (d.error) {
        setMessage(d.error);
        setUpdating(false);
        return;
      }
      // Poll for server return
      setMessage("Restarting...");
      pollForReturn();
    } catch {
      setMessage("Update failed");
      setUpdating(false);
    }
  };

  const handleRestart = async () => {
    if (restarting) return;
    setRestarting(true);
    setMessage("Restarting...");
    try {
      await fetch("/api/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restart" }),
      });
      pollForReturn();
    } catch {
      setMessage("Restart failed");
      setRestarting(false);
    }
  };

  const pollForReturn = () => {
    let attempts = 0;
    const maxAttempts = 30;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch("/api/update", { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          clearInterval(interval);
          const d = await res.json();
          if (d.data) setVersion(d.data);
          setUpdating(false);
          setRestarting(false);
          setMessage("Done!");
          setTimeout(() => setMessage(null), 3000);
        }
      } catch {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setUpdating(false);
          setRestarting(false);
          setMessage("Timeout — check server");
        }
      }
    }, 2000);
  };

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2">
        {version?.updateAvailable && (
          <button
            onClick={handleUpdate}
            disabled={updating}
            className="p-1.5 rounded-lg bg-orange-500/10 text-neon-orange hover:bg-orange-500/20 transition-colors"
            title={`Update available (${version.behind} behind)`}
          >
            {updating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
          </button>
        )}
        <button
          onClick={handleRestart}
          disabled={restarting}
          className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
          title="Restart App"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${restarting ? "animate-spin" : ""}`} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Version status */}
      <div className="rounded-lg bg-white/5 border border-white/5 p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider">
            Mission Control
          </span>
          {version && !version.updateAvailable && (
            <span className="text-[9px] font-mono text-neon-green flex items-center gap-1">
              <Check className="w-2.5 h-2.5" /> {version.localHash}
            </span>
          )}
          {version?.updateAvailable && (
            <span className="text-[9px] font-mono text-neon-orange flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5" /> {version.behind} behind
            </span>
          )}
        </div>

        {/* Update available banner */}
        {version?.updateAvailable && (
          <button
            onClick={handleUpdate}
            disabled={updating || restarting}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-[10px] font-mono text-neon-orange hover:bg-orange-500/20 transition-colors disabled:opacity-50 mb-1.5"
          >
            {updating ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Download className="w-3 h-3" />
            )}
            {updating ? "Updating..." : "Update Now"}
          </button>
        )}

        {/* Status message */}
        {message && (
          <div className="text-[9px] font-mono text-white/40 text-center mb-1">
            {message}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-1.5">
          <button
            onClick={checkVersion}
            disabled={checking || updating || restarting}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${checking ? "animate-spin" : ""}`} />
            {checking ? "..." : "Check"}
          </button>
          <button
            onClick={handleRestart}
            disabled={updating || restarting}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${restarting ? "animate-spin" : ""}`} />
            {restarting ? "..." : "Restart"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfigGroupSection({
  group,
  collapsed,
  renderLink,
}: {
  group: ConfigGroup;
  collapsed: boolean;
  renderLink: (link: SidebarLink) => React.ReactNode;
}) {
  const [open, setOpen] = useState(group.defaultOpen ?? false);

  if (collapsed) {
    return <>{group.links.map((link) => renderLink(link))}</>;
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 w-full text-[10px] font-mono text-white/30 uppercase tracking-widest px-3 mb-1 mt-3 first:mt-0 hover:text-white/50 transition-colors"
      >
        <ChevronDown
          className={`w-3 h-3 transition-transform ${open ? "" : "-rotate-90"}`}
        />
        {group.label}
      </button>
      {open && (
        <div className="space-y-0.5">
          {group.links.map((link) => renderLink(link))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
      active
        ? "bg-white/10 text-white"
        : "text-white/50 hover:bg-white/5 hover:text-white/80"
    }`;

  const renderLink = (link: SidebarLink) => {
    const active = isActive(pathname, link.href);
    return (
      <Link
        key={link.href}
        href={link.href}
        className={linkClass(active)}
        onClick={() => setMobileOpen(false)}
      >
        <link.icon
          className={`w-4 h-4 flex-shrink-0 ${
            active ? iconColorMap[link.color] : ""
          }`}
        />
        {!collapsed && <span>{link.label}</span>}
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg animated-border p-[1.5px]">
            <div className="w-full h-full bg-dark-900 rounded-[5px] flex items-center justify-center">
              <Terminal className="w-4 h-4 text-neon-cyan" />
            </div>
          </div>
          {!collapsed && (
            <div>
              <div className="text-sm font-bold tracking-tight">
                <span className="text-neon-cyan">MC</span>
                <span className="text-white/40 mx-0.5">/</span>
                <span className="text-white">Hermes</span>
              </div>
            </div>
          )}
        </Link>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Main + Agent sections */}
        {mainSections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest px-3 mb-2 mt-4 first:mt-0">
                {section.label}
              </div>
            )}
            {section.links.map(renderLink)}
          </div>
        ))}

        {/* Config Settings section */}
        {!collapsed && (
          <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest px-3 mb-2 mt-4">
            Config Settings
          </div>
        )}
        {collapsed && <div className="my-2 border-t border-white/10" />}

        {/* All Settings link */}
        {renderLink({
          icon: Settings,
          label: "All Settings",
          href: "/config",
          color: "purple",
        })}

        {/* Grouped config sections */}
        {configGroups.map((group) => (
          <ConfigGroupSection
            key={group.label}
            group={group}
            collapsed={collapsed}
            renderLink={renderLink}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-white/10 space-y-2">
        <VersionFooter collapsed={collapsed} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors font-mono"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-dark-900/80 border border-white/10 text-white/60"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop */}
      <aside
        className={`hidden lg:flex flex-col bg-dark-900/80 border-r border-white/10 backdrop-blur-xl transition-all duration-200 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Sidebar — mobile drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-56 bg-dark-950 border-r border-white/10 transform transition-transform ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
