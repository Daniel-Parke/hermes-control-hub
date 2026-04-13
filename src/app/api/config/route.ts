import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import yaml from "js-yaml";

import { PATHS } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";
import { requireMcApiKey, requireNotReadOnly } from "@/lib/api-auth";
import { appendAuditLine } from "@/lib/audit-log";
const CONFIG_PATH = PATHS.config;

function parseConfig(): Record<string, unknown> {
  if (!existsSync(CONFIG_PATH)) {
    return {};
  }
  const content = readFileSync(CONFIG_PATH, "utf-8");
  return (yaml.load(content) as Record<string, unknown>) || {};
}

// Whitelist of config sections that can be modified via PUT
const WRITABLE_SECTIONS = new Set([
  "agent", "display", "memory", "terminal", "compression",
  "security", "tts", "stt", "delegation", "cron", "checkpoints", "approvals",
]);

// Mask sensitive values in config before returning to client
function maskConfigSecrets(config: Record<string, unknown>): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(config));
  // Mask api_key in model section
  if (clone.model && typeof clone.model === "object" && clone.model.api_key) {
    const key = String(clone.model.api_key);
    clone.model.api_key = key.length > 8 ? key.slice(0, 4) + "••••" + key.slice(-4) : "••••";
  }
  return clone;
}

// GET /api/config — return full config (with secrets masked)
export async function GET() {
  try {
    const config = parseConfig();
    return NextResponse.json({ data: maskConfigSecrets(config) });
  } catch (error) {
    logApiError("GET /api/config", "reading config.yaml", error);
    return NextResponse.json(
      { error: "Failed to read config.yaml" },
      { status: 500 }
    );
  }
}

// PUT /api/config — update specific section
export async function PUT(request: NextRequest) {
  const ro = requireNotReadOnly();
  if (ro) return ro;
  const auth = requireMcApiKey(request);
  if (auth) return auth;

  try {
    const body = await request.json();
    const { section, values } = body;

    if (!section || !values) {
      return NextResponse.json(
        { error: "Missing 'section' or 'values'" },
        { status: 400 }
      );
    }

    // Security: only allow whitelisted sections (prevent modifying model/provider keys)
    if (!WRITABLE_SECTIONS.has(section)) {
      return NextResponse.json(
        { error: `Section '${section}' is not writable. Allowed: ${[...WRITABLE_SECTIONS].join(", ")}` },
        { status: 403 }
      );
    }

    const config = parseConfig();

    // Create backup
    if (existsSync(CONFIG_PATH)) {
      const backupDir = PATHS.backups;
      mkdirSync(backupDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = `${backupDir}/config.yaml.${timestamp}.bak`;
      writeFileSync(backupPath, readFileSync(CONFIG_PATH, "utf-8"), "utf-8");
    }

    // Merge values into section
    const current = (config[section] as Record<string, unknown>) || {};
    config[section] = { ...current, ...values };

    // Write back
    const content = yaml.dump(config, { lineWidth: -1, noRefs: true });
    writeFileSync(CONFIG_PATH, content, "utf-8");

    appendAuditLine({
      action: "config.put",
      resource: String(section),
      ok: true,
    });

    return NextResponse.json({ data: { success: true, section, values } });
  } catch (error) {
    logApiError("PUT /api/config", "updating config", error);
    return NextResponse.json(
      { error: "Failed to update config" },
      { status: 500 }
    );
  }
}
