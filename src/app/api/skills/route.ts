import { NextRequest, NextResponse } from "next/server";
import { readFileSync, readdirSync, existsSync, statSync } from "fs";

import { HERMES_HOME } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";

interface Skill {
  name: string;
  category: string;
  path: string;
  description: string;
  enabled: boolean;
  size: number;
  lastModified: string;
}

/** Parse skills.disabled from config YAML */
function getDisabledSkills(configPath: string): Set<string> {
  if (!existsSync(configPath)) return new Set();
  try {
    const content = readFileSync(configPath, "utf-8");
    const lines = content.split("\n");
    let inSkills = false;
    let inDisabled = false;
    const disabled = new Set<string>();

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("skills:")) {
        inSkills = true;
        continue;
      }
      if (inSkills && !line.startsWith(" ") && trimmed) {
        inSkills = false;
        inDisabled = false;
      }
      if (inSkills && trimmed.startsWith("disabled:")) {
        inDisabled = true;
        continue;
      }
      if (inDisabled) {
        const match = trimmed.match(/^-\s*(.+)$/);
        if (match) disabled.add(match[1].trim());
        else if (!line.startsWith("  ") || (!trimmed.startsWith("-") && trimmed)) {
          inDisabled = false;
        }
      }
    }
    return disabled;
  } catch {
    return new Set();
  }
}

function scanSkills(dir: string, category: string, disabled: Set<string>): Skill[] {
  const skills: Skill[] = [];
  if (!existsSync(dir)) return skills;

  try {
    const items = readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.name.startsWith(".")) continue;
      const fullPath = dir + "/" + item.name;

      if (item.isDirectory()) {
        const skillPath = fullPath + "/SKILL.md";
        if (existsSync(skillPath)) {
          try {
            const content = readFileSync(skillPath, "utf-8");
            const stats = statSync(skillPath);
            let description = "";
            const descMatch = content.match(/description:\s*[\"'](.+?)[\"']/);
            if (descMatch) description = descMatch[1];
            else {
              const lines = content.split("\n");
              for (const line of lines) {
                const t = line.trim();
                if (t && !t.startsWith("#") && !t.startsWith("---") && !t.startsWith("```")) {
                  description = t.substring(0, 120);
                  break;
                }
              }
            }

            skills.push({
              name: item.name,
              category: category || "uncategorized",
              path: skillPath,
              description,
              enabled: !disabled.has(item.name),
              size: stats.size,
              lastModified: stats.mtime.toISOString(),
            });
          } catch (error) {
            logApiError("GET /api/skills", `reading skill ${skillPath}`, error);
          }
        }

        // Check for DESCRIPTION.md (category description)
        if (!existsSync(fullPath + "/SKILL.md") && existsSync(fullPath + "/DESCRIPTION.md")) {
          // This is a category directory
          skills.push(...scanSkills(fullPath, item.name, disabled));
        } else if (existsSync(fullPath + "/SKILL.md")) {
          // Check subdirectories within skill dirs (e.g., mlops/training/axolotl)
          try {
            const subItems = readdirSync(fullPath, { withFileTypes: true });
            for (const sub of subItems) {
              if (sub.isDirectory()) {
                const subSkillPath = fullPath + "/" + sub.name + "/SKILL.md";
                if (existsSync(subSkillPath)) {
              try {
                const content = readFileSync(subSkillPath, "utf-8");
                const stats = statSync(subSkillPath);
                let description = "";
                const descMatch = content.match(/description:\s*[\"'](.+?)[\"']/);
                if (descMatch) description = descMatch[1];

                skills.push({
                  name: sub.name,
                  category: category ? category + "/" + item.name : item.name,
                  path: subSkillPath,
                  description,
                  enabled: !disabled.has(sub.name),
                  size: stats.size,
                  lastModified: stats.mtime.toISOString(),
                });
              } catch (error) {
                logApiError("GET /api/skills", `reading sub-skill ${subSkillPath}`, error);
              }
                }
              }
            }
          } catch (error) {
            logApiError("GET /api/skills", `reading sub-skills in ${fullPath}`, error);
          }
        }
      }
    }
  } catch (error) {
    logApiError("GET /api/skills", `reading skills directory ${dir}`, error);
  }
  return skills;
}

export async function GET(request: NextRequest) {
  const profile = request.nextUrl.searchParams.get("profile") || "default";

  try {
    // Determine skills directory and config path
    let skillsDir: string;
    let configPath: string;

    if (profile === "default") {
      skillsDir = HERMES_HOME + "/skills";
      configPath = HERMES_HOME + "/config.yaml";
    } else {
      skillsDir = HERMES_HOME + "/profiles/" + profile + "/skills";
      configPath = HERMES_HOME + "/profiles/" + profile + "/config.yaml";
    }

    const disabled = getDisabledSkills(configPath);
    const skills = scanSkills(skillsDir, "", disabled);

    // Build categories
    const categories: Record<string, Skill[]> = {};
    for (const skill of skills) {
      const cat = skill.category || "uncategorized";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(skill);
    }

    return NextResponse.json({
      data: {
        skills,
        categories,
        total: skills.length,
        categoryCount: Object.keys(categories).length,
        profile,
      },
    });
  } catch (error) {
    logApiError("GET /api/skills", "listing skills", error);
    return NextResponse.json({ error: "Failed to list skills" }, { status: 500 });
  }
}
