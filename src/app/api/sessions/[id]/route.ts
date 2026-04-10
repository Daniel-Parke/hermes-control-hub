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
  const fullPath = sessionsPath + "/" + id;

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
      { error: `Session "${id}" not found` },
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
            logApiError("GET /api/sessions/[id]", "parsing JSONL line " + index + " in session " + id, err);
            return { index, raw: line };
          }
        });

      return NextResponse.json({
        data: {
          id,
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
          id,
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
    logApiError("GET /api/sessions/[id]", "reading session " + id, error);
    return NextResponse.json(
      { error: `Failed to read session "${id}"` },
      { status: 500 }
    );
  }
}
