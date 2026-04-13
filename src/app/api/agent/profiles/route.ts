import { NextResponse } from "next/server";
import { readFileSync, existsSync, statSync, readdirSync } from "fs";

import { HERMES_HOME } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";
import type { ApiResponse } from "@/types/hermes";

export interface AgentProfile {
  id: string;
  name: string;
  description: string;
  personality: string;
  isDefault: boolean;
  skillsCount: number;
  toolsCount: number;
  files: Array<{
    key: string;
    name: string;
    path: string;
    exists: boolean;
    size: number;
    lastModified: string | null;
  }>;
}

function loadYamlPersonality(content: string): string {
  const lines = content.split("\n");
  let inAgent = false;
  for (const line of lines) {
    if (line.trim().startsWith("agent:")) {
      inAgent = true;
      continue;
    }
    if (inAgent && !line.startsWith(" ") && line.trim()) break;
    if (inAgent && line.includes("personality:")) {
      return line.split("personality:")[1].trim().replace(/['"]/g, "") || "technical";
    }
  }
  return "technical";
}

const PROFILE_DESCRIPTIONS: Record<string, string> = {
  "ch-creative-lead": "Creative content and design direction",
  "ch-data-engineer": "Data pipeline and infrastructure engineering",
  "ch-data-scientist": "Machine learning and data science research",
  "ch-devops-engineer": "Infrastructure, CI/CD, and operations",
  "ch-ops-director": "Operations management and coordination",
  "ch-qa-engineer": "Quality assurance and testing",
  "ch-support-agent": "User support and troubleshooting",
  "ch-swe-engineer": "Software engineering and development",
};

function getProfileFiles(profileDir: string): AgentProfile["files"] {
  const files: AgentProfile["files"] = [];
  const fileDefs = [
    { key: "soul", name: "SOUL.md", relPath: "SOUL.md" },
    { key: "agents", name: "AGENTS.md", relPath: "AGENTS.md" },
    { key: "user", name: "USER.md", relPath: "memories/USER.md" },
    { key: "memory", name: "MEMORY.md", relPath: "memories/MEMORY.md" },
  ];

  for (const def of fileDefs) {
    const fullPath = profileDir + "/" + def.relPath;
    const exists = existsSync(fullPath);
    let size = 0;
    let lastModified: string | null = null;
    if (exists) {
      try {
        const stats = statSync(fullPath);
        size = stats.size;
        lastModified = stats.mtime.toISOString();
      } catch {}
    }
    files.push({ key: def.key, name: def.name, path: fullPath, exists, size, lastModified });
  }
  return files;
}

function countProfileSkills(profileDir: string): number {
  const skillsDir = profileDir + "/skills";
  if (!existsSync(skillsDir)) return 0;
  let count = 0;
  try {
    const walk = (dir: string) => {
      for (const item of readdirSync(dir)) {
        const fullPath = dir + "/" + item;
        try {
          const st = statSync(fullPath);
          if (st.isDirectory()) {
            if (existsSync(fullPath + "/SKILL.md")) count++;
            else walk(fullPath);
          }
        } catch {}
      }
    };
    walk(skillsDir);
  } catch {}
  return count;
}

export async function GET() {
  try {
    const profiles: AgentProfile[] = [];

    // Default agent (main)
    const defaultPersonality = loadYamlPersonality(
      existsSync(HERMES_HOME + "/config.yaml")
        ? readFileSync(HERMES_HOME + "/config.yaml", "utf-8")
        : ""
    );

    profiles.push({
      id: "default",
      name: "Bob",
      description: "Main agent — full access to all tools and skills",
      personality: defaultPersonality,
      isDefault: true,
      skillsCount: countProfileSkills(HERMES_HOME),
      toolsCount: 0,
      files: getProfileFiles(HERMES_HOME),
    });

    // Named profiles
    const profilesDir = HERMES_HOME + "/profiles";
    if (existsSync(profilesDir)) {
      for (const entry of readdirSync(profilesDir)) {
        const profileDir = profilesDir + "/" + entry;
        try {
          const st = statSync(profileDir);
          if (!st.isDirectory()) continue;
        } catch {
          continue;
        }

        const configPath = profileDir + "/config.yaml";
        let personality = "technical";
        if (existsSync(configPath)) {
          personality = loadYamlPersonality(readFileSync(configPath, "utf-8"));
        }

        profiles.push({
          id: entry,
          name: entry.replace("ch-", "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          description: PROFILE_DESCRIPTIONS[entry] || "Agent profile",
          personality,
          isDefault: false,
          skillsCount: countProfileSkills(profileDir),
          toolsCount: 0,
          files: getProfileFiles(profileDir),
        });
      }
    }

    return NextResponse.json<ApiResponse<{ profiles: AgentProfile[] }>>({
      data: { profiles },
    });
  } catch (error) {
    logApiError("GET /api/agent/profiles", "listing profiles", error);
    return NextResponse.json({ error: "Failed to list profiles" }, { status: 500 });
  }
}
