// ═══════════════════════════════════════════════════════════════
// Mission Control — Hermes Data Types
// ═══════════════════════════════════════════════════════════════

// ── API Response Envelope ──────────────────────────────────────
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
  };
}

// ── System Status ──────────────────────────────────────────────
export interface SystemStatus {
  soulFile: boolean;
  configFile: boolean;
  skillsCount: number;
  sessionsCount: number;
  memorySize: string;
  timestamp: string;
}

// ── File Editor ────────────────────────────────────────────────
export interface FileData {
  content: string;
  name: string;
  description: string;
  exists: boolean;
  size: number;
}

// ── Skills ─────────────────────────────────────────────────────
export interface Skill {
  name: string;
  category: string;
  path: string;
  description: string;
  size: number;
  lastModified: string;
}

export interface SkillsData {
  skills: Skill[];
  categories: Record<string, Skill[]>;
  total: number;
  categoryCount: number;
}

// ── Sessions ───────────────────────────────────────────────────
export interface Session {
  id: string;
  filename: string;
  title: string;
  size: number;
  created: string;
  modified: string;
  messageCount: number;
  model: string;
  source: string;
}

export interface SessionsData {
  sessions: Session[];
  total: number;
}

// ── Memory ─────────────────────────────────────────────────────
export interface MemoryFact {
  id: number;
  content: string;
  category: string;
  tags: string;
  trust: number;
  created_at: string;
  updated_at: string;
}

export interface MemoryData {
  facts: MemoryFact[];
  total: number;
  dbSize: number;
  error?: string;
  available?: boolean;
  message?: string;
  entities?: number;
  banks?: Array<{ bank_name: string; fact_count: number; updated_at: string }>;
}

// ── Config Sections ────────────────────────────────────────────
export interface AgentConfig {
  max_turns: number;
  reasoning_effort: string;
  tool_use_enforcement: string;
  verbose: boolean;
  gateway_timeout: number;
  personalities: Record<string, string>;
}

export interface ModelConfig {
  default: string;
  provider: string;
  base_url: string;
  api_key: string;
  context_length: number;
}

export interface DisplayConfig {
  skin: string;
  show_cost: boolean;
  show_reasoning: boolean;
  streaming: boolean;
  tool_progress: boolean;
  compact: boolean;
  personality: string;
  tool_preview_length: number;
}

export interface MemoryConfig {
  memory_enabled: boolean;
  provider: string;
  memory_char_limit: number;
  user_char_limit: number;
  nudge_interval: number;
  user_profile_enabled: boolean;
  flush_min_turns: number;
}

export interface TerminalConfig {
  backend: string;
  timeout: number;
  persistent_shell: boolean;
  docker_image: string;
  container_cpu: number;
  container_memory: number;
  container_disk: number;
}

export interface CompressionConfig {
  enabled: boolean;
  threshold: number;
  target_ratio: number;
  summary_model: string;
  summary_provider: string;
  protect_last_n: number;
}

export interface SecurityConfig {
  tirith_enabled: boolean;
  tirith_fail_open: boolean;
  redact_secrets: boolean;
  website_blocklist: {
    domains: string[];
    enabled: boolean;
  };
}

export interface TTSConfig {
  provider: string;
  edge: { voice: string };
  elevenlabs: { voice_id: string };
  openai: { voice: string };
}

export interface STTConfig {
  enabled: boolean;
  provider: string;
  model: string;
  local: { model: string };
}

export interface DelegationConfig {
  model: string;
  provider: string;
  max_iterations: number;
  default_toolsets: string[];
}

export interface CronConfig {
  wrap_response: boolean;
}

export interface CheckpointsConfig {
  enabled: boolean;
  max_snapshots: number;
}

export interface FullConfig {
  _config_version: number;
  agent: AgentConfig;
  model: ModelConfig;
  display: DisplayConfig;
  memory: MemoryConfig;
  terminal: TerminalConfig;
  compression: CompressionConfig;
  security: SecurityConfig;
  tts: TTSConfig;
  stt: STTConfig;
  delegation: DelegationConfig;
  cron: CronConfig;
  checkpoints: CheckpointsConfig;
  approvals: { mode: string; timeout: number };
  [key: string]: unknown;
}

// ── Config Section Definition (for UI rendering) ──────────────
export interface ConfigFieldDef {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "select" | "textarea";
  options?: string[];
  description?: string;
  min?: number;
  max?: number;
}

export interface ConfigSectionDef {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  fields: ConfigFieldDef[];
}

// ── Missions ───────────────────────────────────────────────────
export interface MissionTemplate {
  id: string;
  name: string;
  icon: string;
  color: AccentColor;
  description: string;
  prompt: string;
  goals: string[];
  suggestedSkills: string[];
  defaultModel: string;
  timeoutMinutes: number;
}

export type MissionStatus = "queued" | "dispatched" | "successful" | "failed";
export type DispatchMode = "save" | "now" | "cron";

export interface Mission {
  id: string;
  name: string;
  prompt: string;
  goals: string[];
  skills: string[];
  model: string;
  templateId: string | null;
  status: MissionStatus;
  dispatchMode: DispatchMode;
  createdAt: string;
  updatedAt: string;
  results: string | null;
  duration: number | null;
  error: string | null;
  cronJobId?: string;
}

// ── UI Component Props ─────────────────────────────────────────
export type StatusLevel = "online" | "warning" | "error" | "idle";

export type AccentColor = "cyan" | "purple" | "green" | "pink" | "orange";

export interface NavItem {
  icon: string;
  label: string;
  href: string;
  color: AccentColor;
}
