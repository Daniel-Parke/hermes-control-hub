// ═══════════════════════════════════════════════════════════════
// Regression test: statusColors fallback never crashes
// Bug: statusColors.draft was referenced but didn't exist,
// causing TypeError when mission.status had unexpected value.
// ═══════════════════════════════════════════════════════════════

// Mirror the statusColors map from missions/page.tsx
const statusColors: Record<string, { dot: "online" | "warning" | "error" | "idle"; bg: string; text: string }> = {
  queued: { dot: "warning", bg: "bg-orange-500/10", text: "text-neon-orange" },
  dispatched: { dot: "online", bg: "bg-blue-500/10", text: "text-blue-400" },
  successful: { dot: "online", bg: "bg-green-500/10", text: "text-neon-green" },
  failed: { dot: "error", bg: "bg-red-500/10", text: "text-red-400" },
};

const defaultStatusColor = { dot: "idle" as const, bg: "bg-white/5", text: "text-white/40" };

/** Simulates the lookup from missions/page.tsx line 830 */
function getStatusColor(status: string) {
  return statusColors[status] || defaultStatusColor;
}

describe("statusColors fallback", () => {
  it("returns correct color for known statuses", () => {
    expect(getStatusColor("queued").dot).toBe("warning");
    expect(getStatusColor("dispatched").dot).toBe("online");
    expect(getStatusColor("successful").dot).toBe("online");
    expect(getStatusColor("failed").dot).toBe("error");
  });

  it("returns default color for unknown status (does not crash)", () => {
    const result = getStatusColor("unknown_status");
    expect(result).toBeDefined();
    expect(result.dot).toBe("idle");
    expect(result.bg).toBe("bg-white/5");
    expect(result.text).toBe("text-white/40");
  });

  it("returns default color for empty string status", () => {
    const result = getStatusColor("");
    expect(result).toBeDefined();
    expect(result.dot).toBe("idle");
  });

  it("never returns undefined for any string input", () => {
    const testStatuses = ["queued", "dispatched", "successful", "failed", "", "draft", "cancelled", "pending", "null", "undefined"];
    for (const status of testStatuses) {
      const result = getStatusColor(status);
      expect(result).toBeDefined();
      expect(result.dot).toBeDefined();
      expect(result.bg).toBeDefined();
      expect(result.text).toBeDefined();
    }
  });
});
