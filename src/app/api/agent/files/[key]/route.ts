// ═══════════════════════════════════════════════════════════════
// Agent File CRUD — Read/Write individual behavior files
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "fs";

import { HERMES_HOME, PATHS } from "@/lib/hermes";

import { BEHAVIOR_FILES } from "@/lib/behavior-files";
import { logApiError } from "@/lib/api-logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const fileConfig = BEHAVIOR_FILES[key];

  if (!fileConfig) {
    return NextResponse.json(
      { error: `Unknown file key: ${key}. Available: ${Object.keys(BEHAVIOR_FILES).join(", ")}` },
      { status: 400 }
    );
  }

  try {
    if (!existsSync(fileConfig.path)) {
      return NextResponse.json({
        data: {
          key,
          content: "",
          name: fileConfig.name,
          description: fileConfig.description,
          exists: false,
          size: 0,
        },
      });
    }

    const content = readFileSync(fileConfig.path, "utf-8");
    const stats = statSync(fileConfig.path);
    return NextResponse.json({
      data: {
        key,
        content,
        name: fileConfig.name,
        description: fileConfig.description,
        exists: true,
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
      },
    });
  } catch {
    logApiError("GET /api/agent/files/[key]", `reading ${fileConfig.name}`, undefined);
    return NextResponse.json(
      { error: `Failed to read ${fileConfig.name}` },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const fileConfig = BEHAVIOR_FILES[key];

  if (!fileConfig) {
    return NextResponse.json(
      { error: `Unknown file key: ${key}` },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { content, backup = true } = body;

    if (typeof content !== "string") {
      return NextResponse.json(
        { error: "Content must be a string" },
        { status: 400 }
      );
    }

    // Create backup if file exists
    if (backup && existsSync(fileConfig.path)) {
      const backupDir = PATHS.backups;
      mkdirSync(backupDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = backupDir + "/" + fileConfig.name + "." + timestamp + ".bak";
      const existingContent = readFileSync(fileConfig.path, "utf-8");
      writeFileSync(backupPath, existingContent, "utf-8");
    }

    // Ensure directory exists
    const lastSlash = fileConfig.path.lastIndexOf("/");
    if (lastSlash > 0) {
      mkdirSync(fileConfig.path.slice(0, lastSlash), { recursive: true });
    }

    // Write new content
    writeFileSync(fileConfig.path, content, "utf-8");

    return NextResponse.json({
      data: {
        success: true,
        key,
        name: fileConfig.name,
        size: Buffer.byteLength(content, "utf-8"),
      },
    });
  } catch {
    logApiError("PUT /api/agent/files/[key]", `writing ${fileConfig.name}`, undefined);
    return NextResponse.json(
      { error: `Failed to write ${fileConfig.name}` },
      { status: 500 }
    );
  }
}
