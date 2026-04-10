import yaml from "js-yaml";
import { readFileSync, existsSync } from "fs";
// ═══════════════════════════════════════════════════════════════
// Shared Hermes Configuration — centralised paths and constants
// ═══════════════════════════════════════════════════════════════
// All API routes should import from here instead of constructing
// paths independently. This ensures consistency and portability.

export const HOME = process.env.HOME || "";
export const HERMES_HOME = process.env.HERMES_HOME || (HOME + "/.hermes");
export const MC_DATA_DIR = HERMES_HOME + "/mission-control/data";

// Standard file paths
export const PATHS = {
  config: HERMES_HOME + "/config.yaml",
  env: HERMES_HOME + "/.env",
  soul: HERMES_HOME + "/SOUL.md",
  hermes: HERMES_HOME + "/HERMES.md",
  agent: HERMES_HOME + "/AGENT.md",
  userMd: HERMES_HOME + "/memories/USER.md",
  memoryMd: HERMES_HOME + "/memories/MEMORY.md",
  cronJobs: HERMES_HOME + "/cron/jobs.json",
  sessions: HERMES_HOME + "/sessions",
  skills: HERMES_HOME + "/skills",
  logs: HERMES_HOME + "/logs",
  backups: HERMES_HOME + "/backups",
  memoryDb: HERMES_HOME + "/memory_store.db",
  missions: MC_DATA_DIR + "/missions",
  templates: MC_DATA_DIR + "/templates",
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
}

export function getDefaultModelConfig(): DefaultModelConfig {
  try {
    if (!existsSync(PATHS.config)) return { model: "", provider: "" };
    const content = readFileSync(PATHS.config, "utf-8");
    const parsed = yaml.load(content) as Record<string, unknown>;
    const modelSection = parsed?.model;

    if (typeof modelSection === "string") {
      return { model: modelSection, provider: "" };
    }
    if (typeof modelSection === "object" && modelSection !== null) {
      const mc = modelSection as Record<string, unknown>;
      return {
        model: typeof mc.default === "string" ? mc.default : "",
        provider: typeof mc.provider === "string" ? mc.provider : "",
      };
    }
    return { model: "", provider: "" };
  } catch {
    return { model: "", provider: "" };
  }
}
