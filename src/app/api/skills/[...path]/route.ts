import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";

import { PATHS } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";
import { resolveSkillDirUnderRoot } from "@/lib/path-security";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const resolved = resolveSkillDirUnderRoot(PATHS.skills, path);
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error },
      { status: 400 }
    );
  }
  const skillDir = resolved.skillDir;
  const skillMdPath = skillDir + "/SKILL.md";

  if (!existsSync(skillMdPath)) {
    return NextResponse.json(
      { error: `Skill not found: ${path.join("/")}` },
      { status: 404 }
    );
  }

  try {
    const content = readFileSync(skillMdPath, "utf-8");
    const stats = statSync(skillMdPath);

    // Parse YAML frontmatter
    const frontmatter: Record<string, unknown> = {};
    let body = content;
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (fmMatch) {
      try {
        // Simple YAML parsing for frontmatter
        const lines = fmMatch[1].split("\n");
        for (const line of lines) {
          const colonIdx = line.indexOf(":");
          if (colonIdx > 0) {
            const key = line.slice(0, colonIdx).trim();
            let val: string | string[] = line.slice(colonIdx + 1).trim();
            // Remove quotes
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            frontmatter[key] = val;
          }
        }
      } catch (err) { logApiError("GET /api/skills/[path]", "parsing frontmatter for " + path.join("/"), err); }
      body = content.slice(fmMatch[0].length).trim();
    }

    // Find linked files (references/, templates/, scripts/, assets/)
    const linkedFiles: { name: string; path: string; size: number }[] = [];
    for (const subdir of ["references", "templates", "scripts", "assets"]) {
      const subdirPath = skillDir + "/" + subdir;
      if (existsSync(subdirPath)) {
        try {
          const items = readdirSync(subdirPath, { withFileTypes: true });
          for (const item of items) {
            if (item.isFile()) {
              const fPath = subdirPath + "/" + item.name;
              const fStats = statSync(fPath);
              linkedFiles.push({
                name: item.name,
                path: subdir + "/" + item.name,
                size: fStats.size,
              });
            }
          }
        } catch (err) { logApiError("GET /api/skills/[path]", "reading linked files in " + subdirPath, err); }
      }
    }

    return NextResponse.json({
      data: {
        name: path[path.length - 1],
        path: path.join("/"),
        frontmatter,
        content: body,
        rawContent: content,
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
        linkedFiles,
      },
    });
  } catch (err) {
    logApiError("GET /api/skills/[...path]","reading skill",err);
    return NextResponse.json(
      { error: "Failed to read skill" },
      { status: 500 }
    );
  }
}
