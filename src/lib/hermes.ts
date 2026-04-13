import yaml from "js-yaml";
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
// ═══════════════════════════════════════════════════════════════
// Shared Hermes Configuration — centralised paths and constants
// ═══════════════════════════════════════════════════════════════
// All API routes should import from here instead of constructing
// paths independently. This ensures consistency and portability.
// Default HERMES_HOME matches hermes-agent hermes_constants.get_hermes_home().
//
// Command Hub app data defaults to $HOME/command-hub/data so paths align with
// nested Hermes cron/jobs.py (mark_job_run mission file updates).
// Override with `CH_DATA_DIR`, legacy `CH_DATA_DIR`, or `CONTROL_HUB_DATA_DIR`.

export const HERMES_HOME =
  process.env.HERMES_HOME || homedir() + "/.hermes";

function normalizeDirPath(dir: string): string {
  return dir.replace(/[/\\]+$/, "");
}

/**
 * Command Hub JSON data root (missions, templates, stories, …).
 * Some keys (`operations`, `taskLists`, …) are on-disk paths used by Hermes or commercial tooling;
 * the OSS app does not ship UIs for every path listed here.
 * Default: `$HOME/command-hub/data`. Override with `CH_DATA_DIR`, `CH_DATA_DIR`, or `CONTROL_HUB_DATA_DIR`.
 */
export function getMcDataDir(): string {
  const raw =
    process.env.CH_DATA_DIR ||
    process.env.CH_DATA_DIR ||
    process.env.CONTROL_HUB_DATA_DIR;
  if (raw && String(raw).trim()) {
    return normalizeDirPath(String(raw).trim());
  }
  return normalizeDirPath(homedir() + "/command-hub/data");
}

/** @deprecated Use CH_DATA_DIR; kept for compatibility with existing imports. */
export const CH_DATA_DIR = getMcDataDir();

/** Canonical alias for app data root (same value as CH_DATA_DIR). */
export const CH_DATA_DIR = CH_DATA_DIR;

// Standard file paths
export const PATHS = {
  config: HERMES_HOME + "/config.yaml",
  env: HERMES_HOME + "/.env",
  soul: HERMES_HOME + "/SOUL.md",
  hermes: HERMES_HOME + "/HERMES.md",
  agent: HERMES_HOME + "/AGENTS.md",
  userMd: HERMES_HOME + "/memories/USER.md",
  memoryMd: HERMES_HOME + "/memories/MEMORY.md",
  cronJobs: HERMES_HOME + "/cron/jobs.json",
  sessions: HERMES_HOME + "/sessions",
  skills: HERMES_HOME + "/skills",
  logs: HERMES_HOME + "/logs",
  backups: HERMES_HOME + "/backups",
  memoryDb: HERMES_HOME + "/memory_store.db",
  missions: CH_DATA_DIR + "/missions",
  templates: CH_DATA_DIR + "/templates",
  operations: CH_DATA_DIR + "/operations",
  stories: CH_DATA_DIR + "/stories",
  recroom: CH_DATA_DIR + "/recroom",
  taskLists: CH_DATA_DIR + "/task-lists",
  packages: CH_DATA_DIR + "/packages",
  workspaces: CH_DATA_DIR + "/workspaces",
} as const;

// Read a config value from config.yaml using js-yaml
export function getConfigValue(content: string, dottedKey: string): string {
  try {
    const parsed = yaml.load(content) as Record<string, unknown>;
    const keys = dottedKey.split(".");
    let current: unknown = parsed;
    for (const key of keys) {
      if (typeof current !== "object" || current === null) return "";
      current = (current as Record<string, unknown>)[key];
    }
    return typeof current === "string" ? current : current != null ? String(current) : "";
  } catch {
    return "";
  }
}

// Read Discord home channel from env or config
export function getDiscordHomeChannel(envContent: string): string {
  // Check .env for DISCORD_HOME_CHANNEL
  const match = envContent.match(/^DISCORD_HOME_CHANNEL=(.+)$/m);
  if (match) return match[1].trim().replace(/^['"]|['"]$/g, "");
  return "";
}

// Default model config — reads from config.yaml `model:` section
export interface DefaultModelConfig {
  model: string;
  provider: string;
  base_url: string;
  api_key: string;
}

export function getDefaultModelConfig(): DefaultModelConfig {
  try {
    if (!existsSync(PATHS.config)) return { model: "", provider: "", base_url: "", api_key: "" };
    const content = readFileSync(PATHS.config, "utf-8");
    const parsed = yaml.load(content) as Record<string, unknown>;
    const modelSection = parsed?.model;

    if (typeof modelSection === "string") {
      return { model: modelSection, provider: "", base_url: "", api_key: "" };
    }
    if (typeof modelSection === "object" && modelSection !== null) {
      const ch = modelSection as Record<string, unknown>;
      const defaultModel =
        typeof ch.default === "string"
          ? ch.default
          : typeof ch.model === "string"
            ? ch.model
            : "";
      return {
        model: defaultModel,
        provider: typeof ch.provider === "string" ? ch.provider : "",
        base_url: typeof ch.base_url === "string" ? ch.base_url : "",
        api_key: typeof ch.api_key === "string" ? ch.api_key : "",
      };
    }
    return { model: "", provider: "", base_url: "", api_key: "" };
  } catch {
    return { model: "", provider: "", base_url: "", api_key: "" };
  }
}
