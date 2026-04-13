import { NextRequest, NextResponse } from "next/server";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import yaml from "js-yaml";
import { z } from "zod";

import { PATHS } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";
import { requireMcApiKey, requireNotReadOnly } from "@/lib/api-auth";
import { appendAuditLine } from "@/lib/audit-log";
import { zodErrorResponse } from "@/lib/api-schemas";

const CONFIG_PATH = PATHS.config;

function parseConfig(): Record<string, unknown> {
  if (!existsSync(CONFIG_PATH)) {
    return {};
  }
  const content = readFileSync(CONFIG_PATH, "utf-8");
  return (yaml.load(content) as Record<string, unknown>) || {};
}

function maskApiKey(key: string): string {
  const k = String(key);
  return k.length > 8 ? k.slice(0, 4) + "••••" + k.slice(-4) : "••••";
}

function maskModelSection(model: unknown): Record<string, unknown> {
  if (typeof model === "string") {
    return { default: model };
  }
  if (typeof model !== "object" || model === null) {
    return {};
  }
  const m = { ...(model as Record<string, unknown>) };
  if (typeof m.api_key === "string" && m.api_key) {
    m.api_key = maskApiKey(m.api_key);
  }
  return m;
}

const modelPutSchema = z
  .object({
    default: z.string().optional(),
    provider: z.string().optional(),
    base_url: z.string().optional(),
    context_length: z.number().int().min(1000).max(2_000_000).optional(),
    api_key: z.string().optional(),
  })
  .strict();

// GET /api/config/model — model section only (masked api_key)
export async function GET() {
  try {
    const config = parseConfig();
    const raw = config.model;
    return NextResponse.json({ data: maskModelSection(raw) });
  } catch (error) {
    logApiError("GET /api/config/model", "reading config.yaml", error);
    return NextResponse.json(
      { error: "Failed to read model config" },
      { status: 500 }
    );
  }
}

// PUT /api/config/model — validated merge (api_key omitted or empty = keep existing)
export async function PUT(request: NextRequest) {
  const ro = requireNotReadOnly();
  if (ro) return ro;
  const auth = requireMcApiKey(request);
  if (auth) return auth;

  try {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = modelPutSchema.safeParse(raw);
    if (!parsed.success) {
      return zodErrorResponse(parsed.error);
    }
    const body = parsed.data;

    const config = parseConfig();
    const prev =
      typeof config.model === "object" && config.model !== null
        ? (config.model as Record<string, unknown>)
        : typeof config.model === "string"
          ? { default: config.model as string }
          : {};

    const next: Record<string, unknown> = { ...prev };

    if (body.default !== undefined) next.default = body.default;
    if (body.provider !== undefined) next.provider = body.provider;
    if (body.base_url !== undefined) next.base_url = body.base_url;
    if (body.context_length !== undefined) next.context_length = body.context_length;

    if (body.api_key !== undefined && String(body.api_key).trim() !== "") {
      next.api_key = body.api_key;
    }

    if (existsSync(CONFIG_PATH)) {
      const backupDir = PATHS.backups;
      mkdirSync(backupDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = `${backupDir}/config.yaml.${timestamp}.bak`;
      writeFileSync(backupPath, readFileSync(CONFIG_PATH, "utf-8"), "utf-8");
    }

    config.model = next;
    const content = yaml.dump(config, { lineWidth: -1, noRefs: true });
    writeFileSync(CONFIG_PATH, content, "utf-8");

    appendAuditLine({
      action: "config.model.put",
      resource: "model",
      ok: true,
    });

    return NextResponse.json({ data: maskModelSection(next) });
  } catch (error) {
    logApiError("PUT /api/config/model", "updating model config", error);
    return NextResponse.json(
      { error: "Failed to update model config" },
      { status: 500 }
    );
  }
}
