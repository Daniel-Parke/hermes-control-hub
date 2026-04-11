import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "fs";

import { HERMES_HOME } from "@/lib/hermes";
import { BEHAVIOR_FILES } from "@/lib/behavior-files";
import { logApiError } from "@/lib/api-logger";

/** Resolve file path for a given key and optional profile */
function resolveFilePath(key: string, profile?: string): { path: string; name: string; description: string } | null {
  const fileConfig = BEHAVIOR_FILES[key];
  if (!fileConfig) return null;

  if (!profile || profile === "default") {
    return { path: fileConfig.path, name: fileConfig.name, description: fileConfig.description };
  }

  // Profile-specific paths
  const profileDir = HERMES_HOME + "/profiles/" + profile;
  const pathMap: Record<string, string> = {
    soul: profileDir + "/SOUL.md",
    agents: profileDir + "/AGENTS.md",
    user: profileDir + "/memories/USER.md",
    memory: profileDir + "/memories/MEMORY.md",
    env: HERMES_HOME + "/.env",  // .env is global, not per-profile
  };

  const resolvedPath = pathMap[key];
  if (!resolvedPath) return null;

  return { path: resolvedPath, name: fileConfig.name, description: fileConfig.description };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const profile = request.nextUrl.searchParams.get("profile") || "default";
  const resolved = resolveFilePath(key, profile);

  if (!resolved) {
    return NextResponse.json(
      { error: `Unknown file key: ${key}` },
      { status: 400 }
    );
  }

  try {
    if (!existsSync(resolved.path)) {
      return NextResponse.json({
        data: {
          key,
          content: "",
          name: resolved.name,
          description: resolved.description,
          exists: false,
          size: 0,
        },
      });
    }

    const content = readFileSync(resolved.path, "utf-8");
    const stats = statSync(resolved.path);
    return NextResponse.json({
      data: {
        key,
        content,
        name: resolved.name,
        description: resolved.description,
        exists: true,
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
      },
    });
  } catch (error) {
    logApiError("GET /api/agent/files/[key]", `reading ${resolved.path}`, error);
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const profile = request.nextUrl.searchParams.get("profile") || "default";
  const resolved = resolveFilePath(key, profile);

  if (!resolved) {
    return NextResponse.json({ error: `Unknown file key: ${key}` }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { content, backup } = body;

    if (typeof content !== "string") {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Ensure directory exists
    const dir = resolved.path.substring(0, resolved.path.lastIndexOf("/"));
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Optional backup
    if (backup && existsSync(resolved.path)) {
      const backupDir = HERMES_HOME + "/backups";
      if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const backupName = `${key}-${ts}.md`;
      try {
        writeFileSync(backupDir + "/" + backupName, readFileSync(resolved.path, "utf-8"));
      } catch {}
    }

    writeFileSync(resolved.path, content, "utf-8");

    return NextResponse.json({ data: { success: true, key, path: resolved.path } });
  } catch (error) {
    logApiError("PUT /api/agent/files/[key]", `writing ${resolved.path}`, error);
    return NextResponse.json({ error: "Failed to write file" }, { status: 500 });
  }
}
