import { NextResponse } from "next/server";
import { existsSync, statSync } from "fs";
import { readdir } from "fs/promises";

import { PATHS } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";

export async function GET() {
  try {
    // Check SOUL.md
    const soulPath = PATHS.soul;
    const soulFile = existsSync(soulPath);

    // Check config.yaml
    const configPath = PATHS.config;
    const configFile = existsSync(configPath);

    // Count skills
    let skillsCount = 0;
    const skillsPath = PATHS.skills;
    if (existsSync(skillsPath)) {
      const countSkills = async (dir: string): Promise<number> => {
        let count = 0;
        try {
          const items = await readdir(dir, { withFileTypes: true });
          for (const item of items) {
            if (item.isDirectory()) {
              count += await countSkills(dir + "/" + item.name);
            } else if (item.name === "SKILL.md") {
              count++;
            }
          }
        } catch (err) { logApiError("GET /api/status", "counting skills in " + dir, err); }
        return count;
      };
      skillsCount = await countSkills(skillsPath);
    }

    // Count sessions
    let sessionsCount = 0;
    const sessionsPath = PATHS.sessions;
    if (existsSync(sessionsPath)) {
      try {
        const files = await readdir(sessionsPath);
        sessionsCount = files.filter((f) => f.endsWith(".json") || f.endsWith(".jsonl")).length;
      } catch (err) { logApiError("GET /api/status", "counting sessions", err); }
    }

    // Memory DB size
    let memorySize = "N/A";
    const memoryPath = PATHS.memoryDb;
    if (existsSync(memoryPath)) {
      try {
        const stats = statSync(memoryPath);
        const sizeKB = Math.round(stats.size / 1024);
        memorySize = sizeKB > 1024 ? (sizeKB / 1024).toFixed(1) + " MB" : sizeKB + " KB";
      } catch (err) { logApiError("GET /api/status", "reading memory db stats", err); }
    }

    return NextResponse.json({
      data: {
        soulFile,
        configFile,
        skillsCount,
        sessionsCount,
        memorySize,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logApiError("GET /api/status", "reading system status", error);
    return NextResponse.json(
      { error: "Failed to read system status" },
      { status: 500 }
    );
  }
}