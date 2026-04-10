// ═══════════════════════════════════════════════════════════════
// Agent Files API — List all behavior markdown files
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { readFileSync, existsSync, statSync } from "fs";

import { HERMES_HOME } from "@/lib/hermes";

// Static behavior files — each defines a different aspect of agent personality
import { BEHAVIOR_FILES } from "@/lib/behavior-files";

export async function GET() {
  try {
    const files = Object.entries(BEHAVIOR_FILES).map(([key, config]) => {
      const exists = existsSync(config.path);
      let size = 0;
      let lastModified: string | null = null;
      let content = "";

      if (exists) {
        try {
          const stats = statSync(config.path);
          size = stats.size;
          lastModified = stats.mtime.toISOString();
          content = readFileSync(config.path, "utf-8");
        } catch {}
      }

      return {
        key,
        name: config.name,
        description: config.description,
        category: config.category,
        path: config.path,
        exists,
        size,
        lastModified,
        content,
      };
    });

    return NextResponse.json({ files, total: files.length });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to list behavior files" },
      { status: 500 }
    );
  }
}
