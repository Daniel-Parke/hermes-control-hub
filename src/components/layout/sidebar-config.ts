// ═══════════════════════════════════════════════════════════════
// Sidebar Navigation — Static configuration data
// ═══════════════════════════════════════════════════════════════

import {
  Terminal, Settings, FileText, Database, Clock, Shield, Zap,
  Cpu, Activity, Layers, HardDrive, Wrench, ListTodo, Globe,
  ScrollText, Sparkles, Rocket, Volume2, Mic, GitBranch,
  RotateCcw, ShieldCheck, MessageSquare, Lock, Code, RefreshCw,
  AlertTriangle, Check, Download, BookOpen, Workflow, CheckSquare,
  FolderOpen, Users,
} from "lucide-react";

import type { AccentColor } from "@/types/hermes";

// ── Types ──────────────────────────────────────────────────────

export interface SidebarLink {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  color: AccentColor;
  subLinks?: { label: string; href: string }[];
}

export interface SidebarSection {
  label: string;
  links: SidebarLink[];
}

export interface ConfigGroup {
  label: string;
  defaultOpen?: boolean;
  links: SidebarLink[];
}

// ── Main Sections ──────────────────────────────────────────────

export const mainSections: SidebarSection[] = [
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
          { label: "Library", href: "/recroom/story-weaver/library" },
          { label: "Create", href: "/recroom/story-weaver/create" },
          { label: "Characters", href: "/recroom/story-weaver/characters" },
          { label: "Themes", href: "/recroom/story-weaver/themes" },
        ],
      },
    ],
  },
  {
    label: "Agents",
    links: [
      { icon: Users, label: "Agents", href: "/agent/agents", color: "purple" },
    ],
  },
  {
    label: "Operations",
    links: [
      { icon: FileText, label: "Skills", href: "/skills", color: "green" },
      { icon: Wrench, label: "Tools", href: "/agent/tools", color: "purple" },
      { icon: Sparkles, label: "Personalities", href: "/personalities", color: "purple" },
      { icon: FileText, label: "HERMES.md", href: "/config/hermes_md", color: "cyan" },
      { icon: Lock, label: "Environment", href: "/config/env", color: "orange" },
    ],
  },
];

// ── Config Groups ──────────────────────────────────────────────

export const configGroups: ConfigGroup[] = [
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

// ── Restricted Hrefs ───────────────────────────────────────────

const RESTRICTED_HREFS = new Set([
  "/operations",
  "/task-lists",
  "/workspaces",
  "/packages",
  "/command-room",
]);

export function isRestrictedNavHref(href: string): boolean {
  if (RESTRICTED_HREFS.has(href)) return true;
  for (const p of RESTRICTED_HREFS) {
    if (href.startsWith(p + "/")) return true;
  }
  return false;
}

export const showRestrictedNav = false;
