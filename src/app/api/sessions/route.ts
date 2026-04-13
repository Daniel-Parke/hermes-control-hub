import { NextRequest, NextResponse } from "next/server";
import { readdirSync, existsSync, statSync } from "fs";

import { PATHS } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";
import { sessionsRateLimitResponse } from "@/lib/sessions-api-guard";

export async function GET(request: NextRequest) {
  const limited = sessionsRateLimitResponse(request);
  if (limited) return limited;

  const sessionsPath = PATHS.sessions;

  if (!existsSync(sessionsPath)) {
    return NextResponse.json({ data: { sessions: [], total: 0 } });
  }

  try {
    const files = readdirSync(sessionsPath);
    const sessionFiles = files.filter(
      (f) => f.endsWith(".json") || f.endsWith(".jsonl")
    );

    // PERFORMANCE: Use statSync for metadata, only parse JSON for title/source.
    // Skip message counting in list view — it requires parsing the entire file.
    // Model/source can be derived from filename for cron sessions.
    const sessions = sessionFiles.map((file) => {
      const fullPath = sessionsPath + "/" + file;
      const stats = statSync(fullPath);

      // Extract lightweight metadata from filename pattern
      // Patterns: session_cron_<jobId>_<date>.json, session_<date>_<hash>.json
      let title = "";
      let source = "";

      if (file.startsWith("session_cron_")) {
        source = "cron";
        // Derive title from filename: session_cron_<jobId>_<date>.json
        const parts = file.replace(/\.(json|jsonl)$/, "").split("_");
        if (parts.length >= 4) {
          title = "Cron: " + parts[2] + " — " + parts.slice(3).join(" ");
        }
      } else if (file.startsWith("session_")) {
        source = "cli";
      }

      return {
        id: file.replace(/\.(json|jsonl)$/, ""),
        filename: file,
        title: title || file.replace(/_/g, " ").replace(/\.(json|jsonl)$/, ""),
        size: stats.size,
        created: stats.birthtime.toISOString(),
        modified: stats.mtime.toISOString(),
        messageCount: 0, // Not computed in list view — too expensive (requires full JSON parse)
        model: "",
        source,
      };
    });

    // Sort by modified date descending
    sessions.sort(
      (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()
    );

    return NextResponse.json({
      data: {
        sessions,
        total: sessions.length,
      },
    });
  } catch (error) {
    logApiError("GET /api/sessions", "reading sessions directory", error);
    return NextResponse.json(
      { error: "Failed to read sessions" },
      { status: 500 }
    );
  }
}
