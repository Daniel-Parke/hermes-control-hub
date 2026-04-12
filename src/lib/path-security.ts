// ═══════════════════════════════════════════════════════════════
// Path safety — prevent traversal from user-controlled segments
// ═══════════════════════════════════════════════════════════════

const PROFILE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;

/**
 * Returns a safe profile segment for paths under HERMES_HOME/profiles/<profile>/.
 * Rejects "..", slashes, and other metacharacters. "default" uses global paths.
 */
export function resolveSafeProfileName(
  profileParam: string | null
): { ok: true; profile: string } | { ok: false; error: string } {
  const profile = (profileParam || "default").trim();
  if (profile === "default" || profile === "") {
    return { ok: true, profile: "default" };
  }
  if (!PROFILE_PATTERN.test(profile)) {
    return { ok: false, error: "Invalid profile name" };
  }
  return { ok: true, profile };
}

/**
 * Validates skill URL segments: no empty, ".", "..", or separators.
 * Returns the joined relative path under the skills root, or null if invalid.
 */
export function safeSkillRelativePath(segments: string[]): string | null {
  if (segments.length === 0) return null;
  for (const seg of segments) {
    if (
      seg === "" ||
      seg === "." ||
      seg === ".." ||
      seg.includes("/") ||
      seg.includes("\\")
    ) {
      return null;
    }
  }
  return segments.join("/");
}

/**
 * Builds an absolute skill directory path and verifies it stays under skillsRoot
 * (string prefix check; skillsRoot must not end with slash).
 */
export function resolveSkillDirUnderRoot(
  skillsRoot: string,
  segments: string[]
): { ok: true; skillDir: string } | { ok: false; error: string } {
  const normalizedRoot = skillsRoot.replace(/\/$/, "");
  const rel = safeSkillRelativePath(segments);
  if (!rel) {
    return { ok: false, error: "Invalid skill path" };
  }
  const skillDir = normalizedRoot + "/" + rel;
  const prefix = normalizedRoot + "/";
  if (skillDir !== normalizedRoot && !skillDir.startsWith(prefix)) {
    return { ok: false, error: "Invalid skill path" };
  }
  return { ok: true, skillDir };
}
