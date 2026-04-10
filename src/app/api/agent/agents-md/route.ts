// ═══════════════════════════════════════════════════════════════
// AGENTS.md API — Scan, read, write AGENTS.md files across the system
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
  mkdirSync,
  readdirSync,
} from "fs";
import { join } from "path";

import { HOME, HERMES_HOME, PATHS } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";

// Search roots for AGENTS.md files
const SEARCH_ROOTS = [
  HERMES_HOME,
  HOME + "/mission-control",
  HOME,
];

// Scan a directory tree for AGENTS.md files (depth-limited)
function scanForAgentsMd(
  dir: string,
  depth: number = 0,
  maxDepth: number = 4
): Array<{ path: string; directory: string; size: number; lastModified: string }> {
  if (depth > maxDepth) return [];
  const results: Array<{ path: string; directory: string; size: number; lastModified: string }> = [];

  try {
    // Check for AGENTS.md in this directory
    const agentsMdPath = join(dir, "AGENTS.md");
    if (existsSync(agentsMdPath)) {
      const stats = statSync(agentsMdPath);
      results.push({
        path: agentsMdPath,
        directory: dir.replace(HOME, "~"),
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
      });
    }

    // Recurse into subdirectories (skip node_modules, .git, venv, etc.)
    if (depth < maxDepth) {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (
          entry.isDirectory() &&
          !entry.name.startsWith(".") &&
          entry.name !== "node_modules" &&
          entry.name !== "venv" &&
          entry.name !== "__pycache__" &&
          entry.name !== ".next" &&
          entry.name !== "dist" &&
          entry.name !== "build"
        ) {
          results.push(...scanForAgentsMd(join(dir, entry.name), depth + 1, maxDepth));
        }
      }
    }
  } catch (error) {
    // Permission denied or other error — skip
    logApiError("scanForAgentsMd", `scanning directory ${dir}`, error);
  }

  return results;
}

export async function GET() {
  try {
    const allFiles: Array<{
      path: string;
      directory: string;
      size: number;
      lastModified: string;
      content: string;
    }> = [];

    const seen = new Set<string>();

    for (const root of SEARCH_ROOTS) {
      if (!existsSync(root)) continue;
      const found = scanForAgentsMd(root);
      for (const file of found) {
        if (seen.has(file.path)) continue;
        seen.add(file.path);
        try {
          const content = readFileSync(file.path, "utf-8");
          allFiles.push({ ...file, content });
        } catch (error) { logApiError("GET /api/agent/agents-md", "reading AGENTS.md file", error); }
      }
    }

    return NextResponse.json({ data: { files: allFiles, total: allFiles.length } });
  } catch (error) {
    logApiError("GET /api/agent/agents-md", "scanning for AGENTS.md files", error);
    return NextResponse.json(
      { error: "Failed to scan for AGENTS.md files" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: filePath, content, backup = true } = body;

    if (typeof filePath !== "string" || typeof content !== "string") {
      return NextResponse.json(
        { error: "path and content must be strings" },
        { status: 400 }
      );
    }

    // Security: ensure path is AGENTS.md and under HOME
    const resolvedPath = filePath.replace("~", HOME);
    if (!resolvedPath.endsWith("/AGENTS.md") || !resolvedPath.startsWith(HOME)) {
      return NextResponse.json(
        { error: "Can only edit AGENTS.md files under home directory" },
        { status: 403 }
      );
    }

    // Backup
    if (backup && existsSync(resolvedPath)) {
      const backupDir = PATHS.backups;
      mkdirSync(backupDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const dirName = resolvedPath.replace(HOME + "/", "").replace("/AGENTS.md", "").replace(/\//g, "_");
      const backupPath = backupDir + `/AGENTS.${dirName}.${timestamp}.bak`;
      const existingContent = readFileSync(resolvedPath, "utf-8");
      writeFileSync(backupPath, existingContent, "utf-8");
    }

    // Ensure directory exists
    const dir = resolvedPath.substring(0, resolvedPath.lastIndexOf("/"));
    mkdirSync(dir, { recursive: true });

    // Write
    writeFileSync(resolvedPath, content, "utf-8");

    return NextResponse.json({
      data: { success: true, path: resolvedPath, size: Buffer.byteLength(content, "utf-8") },
    });
  } catch (error) {
    logApiError("PUT /api/agent/agents-md", "writing AGENTS.md file", error);
    return NextResponse.json(
      { error: "Failed to save AGENTS.md" },
      { status: 500 }
    );
  }
}
