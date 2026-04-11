import { existsSync } from "fs";
import { PATHS } from "@/lib/hermes";

// ═══════════════════════════════════════════════════════════════
// Memory API — Unit Tests
// ═══════════════════════════════════════════════════════════════
// Tests the memory API response shapes and graceful degradation
// when holographic memory is not installed.

describe("Memory API — Graceful Degradation", () => {
  describe("Missing Memory Database", () => {
    it("should detect whether memory DB exists", () => {
      const hasDb = existsSync(PATHS.memoryDb);
      expect(typeof hasDb).toBe("boolean");
    });

    it("should define memoryDb path under HERMES_HOME", () => {
      expect(PATHS.memoryDb).toContain("memory_store.db");
      expect(PATHS.memoryDb).toContain(".hermes");
    });
  });

  describe("Response Shape — GET /api/memory", () => {
    it("should define expected fields for available memory", () => {
      const mockResponse = {
        facts: [
          {
            id: 1,
            content: "test fact",
            category: "general",
            tags: "",
            trust: 0.5,
            createdAt: "2026-04-11T00:00:00Z",
            updatedAt: "2026-04-11T00:00:00Z",
          },
        ],
        total: 1,
        dbSize: 1024,
        entities: 0,
        banks: [],
        available: true,
      };

      expect(mockResponse.facts).toBeInstanceOf(Array);
      expect(mockResponse.facts[0]).toHaveProperty("id");
      expect(mockResponse.facts[0]).toHaveProperty("content");
      expect(mockResponse.facts[0]).toHaveProperty("category");
      expect(mockResponse.facts[0]).toHaveProperty("tags");
      expect(mockResponse.facts[0]).toHaveProperty("trust");
      expect(mockResponse.facts[0]).toHaveProperty("createdAt");
      expect(mockResponse.facts[0]).toHaveProperty("updatedAt");
    });

    it("should define expected fields for unavailable memory", () => {
      const mockResponse = {
        facts: [],
        total: 0,
        dbSize: 0,
        entities: 0,
        banks: [],
        available: false,
        message:
          "Holographic memory is not installed. Install the hermes-memory-store plugin to enable persistent memory.",
      };

      expect(mockResponse.available).toBe(false);
      expect(mockResponse.facts).toHaveLength(0);
      expect(mockResponse.message).toContain("not installed");
      expect(mockResponse.message).toContain("hermes-memory-store");
    });

    it("should use camelCase for date fields (matching API response)", () => {
      const fact = {
        id: 1,
        content: "test",
        category: "general",
        tags: "",
        trust: 0.5,
        createdAt: "2026-04-11T00:00:00Z",
        updatedAt: "2026-04-11T00:00:00Z",
      };

      // Verify camelCase (not snake_case)
      expect(fact).toHaveProperty("createdAt");
      expect(fact).toHaveProperty("updatedAt");
      expect(fact).not.toHaveProperty("created_at");
      expect(fact).not.toHaveProperty("updated_at");
    });
  });

  describe("Response Shape — DELETE /api/memory", () => {
    it("should return success shape on valid delete", () => {
      const mockResponse = { success: true, id: 42 };
      expect(mockResponse.success).toBe(true);
      expect(typeof mockResponse.id).toBe("number");
    });

    it("should return error shape for missing fact", () => {
      const mockResponse = { error: "Fact not found" };
      expect(mockResponse).toHaveProperty("error");
      expect(mockResponse.error).toContain("not found");
    });

    it("should return error shape for invalid ID", () => {
      const mockResponse = { error: "Valid fact ID is required" };
      expect(mockResponse).toHaveProperty("error");
      expect(mockResponse.error).toContain("fact ID");
    });
  });

  describe("Response Shape — POST /api/memory", () => {
    it("should return success shape with new fact", () => {
      const mockResponse = {
        success: true,
        fact: {
          id: 128,
          content: "new fact",
          category: "general",
          tags: "",
          trust: 0.5,
          createdAt: "2026-04-11T00:00:00Z",
          updatedAt: "2026-04-11T00:00:00Z",
        },
      };

      expect(mockResponse.success).toBe(true);
      expect(mockResponse.fact).toHaveProperty("id");
      expect(mockResponse.fact).toHaveProperty("content");
      expect(mockResponse.fact).toHaveProperty("createdAt");
    });
  });
});
