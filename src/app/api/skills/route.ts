import { NextResponse } from "next/server";
import { readFileSync, readdirSync, existsSync, statSync } from "fs";

import { HERMES_HOME, PATHS } from "@/lib/hermes";
import { ApiResponse } from "@/types/hermes";
import { logApiError } from "@/lib/api-logger";

interface Skill {
  name: string;
  category: string;
  path: string;
  description: string;
  size: number;
  lastModified: string;
}

function scanSkills(dir: string, category: string = ""): Skill[] {
  const skills: Skill[] = [];

  if (!existsSync(dir)) return skills;

  try {
    const items = readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      if (item.name.startsWith(".")) continue;

      const fullPath = dir + "/" + item.name;

      if (item.isDirectory()) {
        // Check for SKILL.md in this directory
        const skillPath = fullPath + "/SKILL.md";
        if (existsSync(skillPath)) {
          try {
            const content = readFileSync(skillPath, "utf-8");
            const stats = statSync(skillPath);

            // Extract description from frontmatter or first paragraph
            let description = "";
            const descMatch = content.match(/description:\s*["'](.+?)["']/);
            if (descMatch) {
              description = descMatch[1];
            } else {
              // Try to get first non-empty line after heading
              const lines = content.split("\n");
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("---") && !trimmed.startsWith("```")) {
                  description = trimmed.substring(0, 120);
                  break;
                }
              }
            }

            skills.push({
              name: item.name,
              category: category || "uncategorized",
              path: skillPath,
              description,
              size: stats.size,
              lastModified: stats.mtime.toISOString(),
            });
          } catch (err) { logApiError("GET /api/skills", "reading SKILL.md " + skillPath, err); }
        }

        // Recurse into subdirectories
        const subCategory = category ? category + "/" + item.name : item.name;
        skills.push(...scanSkills(fullPath, subCategory));
      }
    }
  } catch (err) { logApiError("GET /api/skills", "scanning directory " + dir, err); }

  return skills;
}

export async function GET() {
  const skillsPath = PATHS.skills;
  const skills = scanSkills(skillsPath);

  // Group by category
  const categories: Record<string, Skill[]> = {};
  for (const skill of skills) {
    const topCategory = skill.category.split("/")[0];
    if (!categories[topCategory]) {
      categories[topCategory] = [];
    }
    categories[topCategory].push(skill);
  }

  return NextResponse.json({
    data: {
      skills,
      categories,
      total: skills.length,
      categoryCount: Object.keys(categories).length,
    },
  });
}