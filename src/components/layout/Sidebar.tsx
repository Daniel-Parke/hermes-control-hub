// ═══════════════════════════════════════════════════════════════

// Sidebar Navigation — Config Settings with categorized groups

// ═══════════════════════════════════════════════════════════════



"use client";



import { useState, useEffect, useCallback, useRef } from "react";

import Link from "next/link";

import { usePathname } from "next/navigation";

import { useSidebar } from "./SidebarContext";

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

  BookOpen,

  Workflow,

  CheckSquare,

  FolderOpen,

} from "lucide-react";


import type { AccentColor } from "@/types/hermes";

import { iconColorMap } from "@/lib/theme";



interface SidebarLink {

  icon: React.ComponentType<{ className?: string }>;

  label: string;

  href: string;

  color: AccentColor;

  subLinks?: { label: string; href: string }[];

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



const RESTRICTED_HREFS = new Set([

  "/operations",

  "/task-lists",

  "/workspaces",

  "/packages",

  "/command-room",

]);



function isRestrictedNavHref(href: string): boolean {

  if (RESTRICTED_HREFS.has(href)) return true;

  for (const p of RESTRICTED_HREFS) {

    if (href.startsWith(p + "/")) return true;

  }

  return false;

}



const showRestrictedNav = false;



const mainSections: SidebarSection[] = [

  {

    label: "Main",

    links: [

      { icon: Zap, label: "Dashboard", href: "/", color: "cyan" },

      { icon: Rocket, label: "Missions", href: "/missions", color: "cyan" },

      { icon: Workflow, label: "Operations", href: "/operations", color: "purple" },

      { icon: CheckSquare, label: "Task Lists", href: "/task-lists", color: "orange" },

      { icon: ListTodo, label: "Cron", href: "/cron", color: "orange" },

      { icon: Clock, label: "Sessions", href: "/sessions", color: "orange" },

      { icon: FolderOpen, label: "Workspaces", href: "/workspaces", color: "green" },

      { icon: Database, label: "Memory", href: "/memory", color: "pink" },

      { icon: Globe, label: "Gateway", href: "/gateway", color: "cyan" },

      { icon: ScrollText, label: "Logs", href: "/logs", color: "cyan" },

      { icon: MessageSquare, label: "Command Room", href: "/command-room", color: "purple" },

    ],

  },

  {

    label: "Rec Room",

    links: [

      {

        icon: BookOpen, label: "Story Weaver", href: "/recroom/story-weaver", color: "purple",

        subLinks: [

          { label: "Reading Desk", href: "/recroom/story-weaver/reading-desk" },

          { label: "Library", href: "/recroom/story-weaver/library" },

          { label: "Create", href: "/recroom/story-weaver/create" },

          { label: "Characters", href: "/recroom/story-weaver/characters" },

          { label: "Prompts", href: "/recroom/story-weaver/prompts" },

        ],

      },

    ],

  },

  {

    label: "Agent",

    links: [

      { icon: Brain, label: "Behaviour", href: "/agent/behaviour", color: "cyan" },

      { icon: FileText, label: "Skills", href: "/skills", color: "green" },

      { icon: Wrench, label: "Tools", href: "/agent/tools", color: "purple" },

      { icon: Sparkles, label: "Personalities", href: "/personalities", color: "purple" },

      { icon: FileText, label: "HERMES.md", href: "/config/hermes_md", color: "cyan" },

      { icon: Lock, label: "Environment", href: "/config/env", color: "orange" },

    ],

  },

];



const configGroups: ConfigGroup[] = [

  {

    label: "Core",

    defaultOpen: false,

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

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isMountedRef = useRef(true);



  useEffect(() => {

    isMountedRef.current = true;

    return () => {

      isMountedRef.current = false;

      if (pollIntervalRef.current !== null) {

        clearInterval(pollIntervalRef.current);

        pollIntervalRef.current = null;

      }

    };

  }, []);



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



  // No auto-check — user clicks "Check" to trigger



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

    if (pollIntervalRef.current !== null) {

      clearInterval(pollIntervalRef.current);

      pollIntervalRef.current = null;

    }

    let attempts = 0;

    const maxAttempts = 30;

    const interval = setInterval(async () => {

      attempts++;

      try {

        const res = await fetch("/api/update", { signal: AbortSignal.timeout(3000) });

        if (res.ok) {

          clearInterval(interval);

          pollIntervalRef.current = null;

          const d = await res.json();

          if (!isMountedRef.current) return;

          if (d.data) setVersion(d.data);

          setUpdating(false);

          setRestarting(false);

          setMessage("Done!");

          setTimeout(() => {

            if (isMountedRef.current) setMessage(null);

          }, 3000);

        }

      } catch {

        if (attempts >= maxAttempts) {

          clearInterval(interval);

          pollIntervalRef.current = null;

          if (!isMountedRef.current) return;

          setUpdating(false);

          setRestarting(false);

          setMessage("Timeout — check server");

        }

      }

    }, 2000);

    pollIntervalRef.current = interval;

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

      <div className="rounded-lg bg-white/5 border border-white/5 p-2.5">

        <div className="flex items-center justify-between mb-1.5">

          <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider">

            Control Hub

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



        {/* State 1: Unknown — no check yet */}

        {!version && !checking && (

          <button

            onClick={checkVersion}

            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[10px] font-mono text-blue-400 hover:bg-blue-500/20 transition-colors mb-1.5"

          >

            <RefreshCw className="w-3 h-3" />

            Check for Update

          </button>

        )}



        {/* Checking spinner */}

        {checking && (

          <div className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-white/5 text-[10px] font-mono text-white/40 mb-1.5">

            <RefreshCw className="w-3 h-3 animate-spin" />

            Checking...

          </div>

        )}



        {/* State 2: Up to date */}

        {version && !version.updateAvailable && (

          <div className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-green-500/10 border border-green-500/20 text-[10px] font-mono text-neon-green mb-1.5">

            <Check className="w-3 h-3" />

            Up to date

          </div>

        )}



        {/* State 3: Update available */}

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



        {/* Check + Restart buttons */}

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

  const { mobileOpen, setMobileOpen } = useSidebar();



  const linkClass = (active: boolean) =>

    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${

      active

        ? "bg-white/10 text-white"

        : "text-white/50 hover:bg-white/5 hover:text-white/80"

    }`;



  const renderLink = (link: SidebarLink) => {

    const active = isActive(pathname, link.href);

    const showSubs = active && link.subLinks && !collapsed;

    return (

      <div key={link.href}>

        <Link

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

        {showSubs && (

          <div className="ml-7 mt-1 space-y-0.5 border-l border-white/5 pl-3">

            {link.subLinks!.map((sub) => (

              <Link

                key={sub.href}

                href={sub.href}

                className={`block py-1 text-xs transition-colors ${

                  pathname === sub.href

                    ? "text-white/80"

                    : "text-white/30 hover:text-white/60"

                }`}

                onClick={() => setMobileOpen(false)}

              >

                {sub.label}

              </Link>

            ))}

          </div>

        )}

      </div>

    );

  };



  const sidebarContent = (

    <div className="flex flex-col h-full">

      {/* Logo — h-12 to match mobile top bar */}

      <div className="px-4 h-12 flex items-center border-b border-white/10">

        <Link href="/" className="flex items-center gap-2">

          <div className="w-8 h-8 rounded-lg animated-border p-[1.5px]">

            <div className="w-full h-full bg-dark-900 rounded-[5px] flex items-center justify-center">

              <Terminal className="w-4 h-4 text-neon-cyan" />

            </div>

          </div>

          {!collapsed && (

            <div>

              <div className="text-sm font-bold tracking-tight">

                <span className="text-neon-cyan">CH</span>

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

            {section.links

              .filter((link) => showRestrictedNav || !isRestrictedNavHref(link.href))

              .map(renderLink)}

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

