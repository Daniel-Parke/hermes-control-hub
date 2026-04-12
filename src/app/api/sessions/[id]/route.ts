import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync, statSync } from "fs";

import { HERMES_HOME, PATHS } from "@/lib/hermes";
import { ApiResponse } from "@/types/hermes";
import { logApiError } from "@/lib/api-logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionsPath = PATHS.sessions;

  // Security: prevent path traversal by resolving and checking prefix
  const sanitizedId = id.replace(/[^a-zA-Z0-9_.-]/g, "");
  if (sanitizedId !== id || sanitizedId.includes("..")) {
    return NextResponse.json(
      { error: "Invalid session ID" },
      { status: 400 }
    );
  }

  const fullPath = sessionsPath + "/" + sanitizedId;

  // Try both .json and .jsonl extensions
  let filePath = "";
  if (existsSync(fullPath)) {
    filePath = fullPath;
  } else if (existsSync(fullPath + ".json")) {
    filePath = fullPath + ".json";
  } else if (existsSync(fullPath + ".jsonl")) {
    filePath = fullPath + ".jsonl";
  } else {
      return NextResponse.json(
        { error: `Session "${sanitizedId}" not found` },
        { status: 404 }
      );
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const stats = statSync(filePath);

    if (filePath.endsWith(".jsonl")) {
      // Parse JSONL — one JSON object per line
      const messages = content
        .split("\n")
        .filter((line) => line.trim())
        .map((line, index) => {
          try {
            const msg = JSON.parse(line);
            return { index, ...msg };
          } catch (err) {
            logApiError("GET /api/sessions/[id]", "parsing JSONL line " + index + " in session " + sanitizedId, err);
            return { index, raw: line };
          }
        });

      return NextResponse.json({
        data: {
          id: sanitizedId,
          filename: filePath.split("/").pop(),
          format: "jsonl",
          messages,
          messageCount: messages.length,
          size: stats.size,
        },
      });
    } else {
      // Parse JSON
      const data = JSON.parse(content);
      const messages = data.messages || data.conversation || data.turns || [];

      return NextResponse.json({
        data: {
          id: sanitizedId,
          filename: filePath.split("/").pop(),
          format: "json",
          title: data.title || data.name || "",
          model: data.model || "",
          source: data.source || "",
          messages,
          messageCount: messages.length,
          size: stats.size,
          created: data.created || stats.birthtime.toISOString(),
        },
      });
    }
  } catch (error) {
    logApiError("GET /api/sessions/[id]", "reading session " + sanitizedId, error);
    return NextResponse.json(
      { error: `Failed to read session "${sanitizedId}"` },
      { status: 500 }
    );
  }
}
