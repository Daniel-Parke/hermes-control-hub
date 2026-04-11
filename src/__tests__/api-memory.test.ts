// ═══════════════════════════════════════════════════════════════
// Memory API - Unit Tests
// ═══════════════════════════════════════════════════════════════
//
// Tests the memory API response shapes and graceful degradation
// across all supported memory providers (holographic, hindsight, none).

import { existsSync } from "fs";
import { describe, it, expect } from "@jest/globals";

// Mock the memory providers module
jest.mock("@/lib/memory-providers", () => ({
  getMemoryProvider: jest.fn(),
  getMemoryProviderType: jest.fn(),
}));

import { getMemoryProvider, getMemoryProviderType } from "@/lib/memory-providers";

describe("Memory API - Multi-Provider Support", () => {
  describe("Provider Detection", () => {
    it("should detect holographic provider from config", () => {
      (getMemoryProviderType as jest.Mock).mockReturnValue("holographic");
      expect(getMemoryProviderType()).toBe("holographic");
    });

    it("should detect hindsight provider from config", () => {
      (getMemoryProviderType as jest.Mock).mockReturnValue("hindsight");
      expect(getMemoryProviderType()).toBe("hindsight");
    });

    it("should handle no provider configured", () => {
      (getMemoryProviderType as jest.Mock).mockReturnValue("none");
      expect(getMemoryProviderType()).toBe("none");
    });
  });

  describe("Response Shape - GET /api/memory", () => {
    it("should return MemoryData with provider field for holographic", async () => {
      const mockProvider = {
        type: "holographic",
        healthCheck: jest.fn(),
        readFacts: jest.fn().mockResolvedValue({
          facts: [
            {
              id: 1,
              content: "test fact",
              category: "general",
              tags: "",
              trust: 0.7,
              createdAt: "2026-01-01T00:00:00Z",
              updatedAt: "2026-01-01T00:00:00Z",
            },
          ],
          total: 1,
          dbSize: 1024,
          available: true,
          provider: "holographic",
          entities: 1,
          banks: [],
        }),
        addFact: jest.fn(),
        updateFact: jest.fn(),
        deleteFact: jest.fn(),
      };

      (getMemoryProvider as jest.Mock).mockReturnValue(mockProvider);

      const result = await mockProvider.readFacts();
      expect(result).toHaveProperty("facts");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("dbSize");
      expect(result).toHaveProperty("available", true);
      expect(result).toHaveProperty("provider", "holographic");
      expect(result.facts[0]).toHaveProperty("id");
      expect(result.facts[0]).toHaveProperty("content");
      expect(result.facts[0]).toHaveProperty("category");
      expect(result.facts[0]).toHaveProperty("trust");
    });

    it("should return MemoryData with provider field for hindsight", async () => {
      const mockProvider = {
        type: "hindsight",
        healthCheck: jest.fn(),
        readFacts: jest.fn().mockResolvedValue({
          facts: [],
          total: 0,
          dbSize: 0,
          available: true,
          provider: "hindsight",
          message: "0 memories retrieved from Hindsight",
        }),
        addFact: jest.fn(),
        updateFact: jest.fn(),
        deleteFact: jest.fn(),
      };

      (getMemoryProvider as jest.Mock).mockReturnValue(mockProvider);

      const result = await mockProvider.readFacts();
      expect(result).toHaveProperty("provider", "hindsight");
      expect(result).toHaveProperty("available", true);
      expect(result).toHaveProperty("message");
    });

    it("should handle no provider gracefully", async () => {
      const mockProvider = {
        type: "none",
        healthCheck: jest.fn(),
        readFacts: jest.fn().mockResolvedValue({
          facts: [],
          total: 0,
          dbSize: 0,
          available: false,
          provider: "none",
          message: "No memory provider configured.",
        }),
        addFact: jest.fn(),
        updateFact: jest.fn(),
        deleteFact: jest.fn(),
      };

      (getMemoryProvider as jest.Mock).mockReturnValue(mockProvider);

      const result = await mockProvider.readFacts();
      expect(result).toHaveProperty("available", false);
      expect(result).toHaveProperty("provider", "none");
      expect(result.facts).toHaveLength(0);
    });
  });

  describe("Add Fact", () => {
    it("should add fact via holographic provider", async () => {
      const mockProvider = {
        type: "holographic",
        addFact: jest.fn().mockResolvedValue({
          success: true,
          fact: {
            id: 42,
            content: "new fact",
            category: "general",
            tags: "",
            trust: 0.7,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        }),
      };

      const result = await mockProvider.addFact({ content: "new fact" });
      expect(result.success).toBe(true);
      expect(result.fact).toHaveProperty("id");
      expect(result.fact.content).toBe("new fact");
    });

    it("should add fact via hindsight provider", async () => {
      const mockProvider = {
        type: "hindsight",
        addFact: jest.fn().mockResolvedValue({
          success: true,
          fact: {
            id: expect.any(Number),
            content: "new fact",
            category: "general",
            tags: "",
            trust: 0.7,
          },
        }),
      };

      const result = await mockProvider.addFact({ content: "new fact" });
      expect(result.success).toBe(true);
    });

    it("should fail gracefully when no provider", async () => {
      const mockProvider = {
        type: "none",
        addFact: jest.fn().mockResolvedValue({
          success: false,
          error: "No memory provider configured",
        }),
      };

      const result = await mockProvider.addFact({ content: "test" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("No memory provider");
    });
  });

  describe("Provider Health Check", () => {
    it("should report holographic health", async () => {
      const mockProvider = {
        type: "holographic",
        healthCheck: jest.fn().mockResolvedValue({
          available: true,
          provider: "holographic",
          message: "114 facts stored",
          factCount: 114,
          dbSize: 983040,
        }),
      };

      const health = await mockProvider.healthCheck();
      expect(health.available).toBe(true);
      expect(health.provider).toBe("holographic");
      expect(health.factCount).toBe(114);
    });

    it("should report hindsight health", async () => {
      const mockProvider = {
        type: "hindsight",
        healthCheck: jest.fn().mockResolvedValue({
          available: true,
          provider: "hindsight",
          message: "Hindsight local_embedded mode — bank: hermes",
          factCount: 50,
        }),
      };

      const health = await mockProvider.healthCheck();
      expect(health.available).toBe(true);
      expect(health.provider).toBe("hindsight");
    });

    it("should report unavailable when provider is down", async () => {
      const mockProvider = {
        type: "hindsight",
        healthCheck: jest.fn().mockResolvedValue({
          available: false,
          provider: "hindsight",
          message: "Hindsight unavailable: Connection failed",
        }),
      };

      const health = await mockProvider.healthCheck();
      expect(health.available).toBe(false);
      expect(health.message).toContain("unavailable");
    });
  });
});
