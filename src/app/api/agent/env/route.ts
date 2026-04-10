// ═══════════════════════════════════════════════════════════════
// Env API — Masked .env reader/writer (never exposes raw secrets)
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { PATHS } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";

// Keys whose values are safe to show (non-sensitive)
const SAFE_KEYS = new Set([
  "HERMES_HOME", "PORT", "TERMINAL_BACKEND", "TERMINAL_TIMEOUT",
  "TERMINAL_LIFETIME_SECONDS", "BROWSER_SESSION_TIMEOUT",
  "BROWSER_INACTIVITY_TIMEOUT", "HERMES_MAX_ITERATIONS",
  "AUXILIARY_COMPRESSION_PROVIDER", "CONTEXT_SUMMARY_PROVIDER",
  "AUXILIARY_VISION_PROVIDER", "AUXILIARY_APPROVAL_PROVIDER",
  "AUXILIARY_SESSION_SEARCH_PROVIDER", "AUXILIARY_FLUSH_MEMORIES_PROVIDER",
  "DISCORD_HOME_CHANNEL", "DISCORD_HOME_CHANNEL_NAME",
  "TELEGRAM_HOME_CHANNEL", "TELEGRAM_HOME_CHANNEL_NAME",
]);

function isSensitiveKey(key: string): boolean {
  const upper = key.toUpperCase();
  return (
    upper.includes("TOKEN") ||
    upper.includes("KEY") ||
    upper.includes("SECRET") ||
    upper.includes("PASSWORD") ||
    upper.includes("CREDENTIAL") ||
    upper.includes("AUTH")
  );
}

function maskValue(value: string): string {
  if (!value) return "";
  if (value.length <= 4) return "••••";
  return value.slice(0, 2) + "••••••" + value.slice(-2);
}

interface EnvEntry {
  key: string;
  value: string;
  masked: string;
  sensitive: boolean;
  isComment: boolean;
  isEmpty: boolean;
}

function parseEnv(content: string): EnvEntry[] {
  const entries: EnvEntry[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      entries.push({ key: "", value: "", masked: "", sensitive: false, isComment: false, isEmpty: true });
      continue;
    }

    // Comment line
    if (trimmed.startsWith("#")) {
      entries.push({ key: "", value: trimmed, masked: trimmed, sensitive: false, isComment: true, isEmpty: false });
      continue;
    }

    // Key=Value
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
      const sensitive = isSensitiveKey(key) && !SAFE_KEYS.has(key);
      entries.push({
        key,
        value,
        masked: sensitive ? maskValue(value) : value,
        sensitive,
        isComment: false,
        isEmpty: false,
      });
    }
  }
  return entries;
}

export async function GET() {
  try {
    if (!existsSync(PATHS.env)) {
      return NextResponse.json({ data: { entries: [], total: 0, exists: false } });
    }

    const content = readFileSync(PATHS.env, "utf-8");
    const entries = parseEnv(content);

    return NextResponse.json({
      data: {
        entries,
        total: entries.filter((e) => !e.isComment && !e.isEmpty).length,
        exists: true,
      },
    });
  } catch (error) {
    logApiError("GET /api/agent/env", "reading .env", error);
    return NextResponse.json(
      { error: "Failed to read .env" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    if (!existsSync(PATHS.env)) {
      // Create directory if needed
      const dir = PATHS.env.substring(0, PATHS.env.lastIndexOf("/"));
      mkdirSync(dir, { recursive: true });
      writeFileSync(PATHS.env, `# Hermes Agent Environment Configuration\n\n${key}=${value}\n`, "utf-8");
      return NextResponse.json({ data: { success: true, key, action: "created" } });
    }

    const content = readFileSync(PATHS.env, "utf-8");
    const lines = content.split("\n");
    let found = false;
    const newLines = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || !trimmed) return line;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const existingKey = trimmed.slice(0, eqIdx).trim();
        if (existingKey === key) {
          found = true;
          return `${key}=${value}`;
        }
      }
      return line;
    });

    // If key not found, append it
    if (!found) {
      newLines.push(`${key}=${value}`);
    }

    // Backup before writing
    const backupDir = PATHS.backups;
    mkdirSync(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    writeFileSync(`${backupDir}/.env.${timestamp}.bak`, content, "utf-8");

    writeFileSync(PATHS.env, newLines.join("\n"), "utf-8");

    return NextResponse.json({ data: { success: true, key, action: found ? "updated" : "added" } });
  } catch (error) {
    logApiError("PUT /api/agent/env", "updating .env", error);
    return NextResponse.json(
      { error: "Failed to update .env" },
      { status: 500 }
    );
  }
}
