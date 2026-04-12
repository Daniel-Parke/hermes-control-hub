import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";

import { HERMES_HOME } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";

/** Find the SKILL.md file for a given skill name */
function findSkillFile(skillName: string, profile: string): string | null {
  const searchDirs: string[] = [];

  if (profile === "default") {
    searchDirs.push(HERMES_HOME + "/skills");
  } else {
    searchDirs.push(HERMES_HOME + "/profiles/" + profile + "/skills");
    // Also check default skills directory
    searchDirs.push(HERMES_HOME + "/skills");
  }

  for (const baseDir of searchDirs) {
    if (!existsSync(baseDir)) continue;

    // Direct match: <baseDir>/<skillName>/SKILL.md
    const directPath = baseDir + "/" + skillName + "/SKILL.md";
    if (existsSync(directPath)) return directPath;

    // Walk subdirectories
    try {
      const walk = (dir: string): string | null => {
        for (const item of readdirSync(dir)) {
          const fullPath = dir + "/" + item;
          try {
            const st = statSync(fullPath);
            if (st.isDirectory()) {
              // Check if this dir matches
              if (item === skillName && existsSync(fullPath + "/SKILL.md")) {
                return fullPath + "/SKILL.md";
              }
              const result = walk(fullPath);
              if (result) return result;
            }
          } catch {}
        }
        return null;
      };
      const found = walk(baseDir);
      if (found) return found;
    } catch {}
  }

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const profile = request.nextUrl.searchParams.get("profile") || "default";

  try {
    const filePath = findSkillFile(name, profile);

    if (!filePath || !existsSync(filePath)) {
      return NextResponse.json(
        { error: `Skill not found: ${name}` },
        { status: 404 }
      );
    }

    const content = readFileSync(filePath, "utf-8");
    const stats = statSync(filePath);

    return NextResponse.json({
      data: {
        name,
        path: filePath,
        content,
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
      },
    });
  } catch (error) {
    logApiError("GET /api/skills/[name]", `reading skill ${name}`, error);
    return NextResponse.json({ error: "Failed to read skill" }, { status: 500 });
  }
}
