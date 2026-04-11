// ═══════════════════════════════════════════════════════════════
// Memory Provider Factory — Detect and route to active provider
// ═══════════════════════════════════════════════════════════════
//
// Reads ~/.hermes/config.yaml to determine which memory provider
// is active, then delegates to the appropriate implementation.
//
// Supported providers:
//   - holographic: SQLite direct access (memory_store.db)
//   - hindsight: HTTP API to local/cloud Hindsight server
//   - none: Graceful degradation when no provider configured

import { readFileSync, existsSync } from "fs";
import { HERMES_HOME } from "@/lib/hermes";
import type { MemoryProvider, MemoryProviderType } from "./types";
import { holographicProvider } from "./holographic";
import { hindsightProvider } from "./hindsight";

/** Parse the memory provider from config.yaml */
function getConfiguredProvider(): MemoryProviderType {
  try {
    const configPath = HERMES_HOME + "/config.yaml";
    if (!existsSync(configPath)) return "none";

    const content = readFileSync(configPath, "utf-8");
    const lines = content.split("\n");
    let inMemory = false;

    for (const line of lines) {
      if (line.trim().startsWith("memory:")) {
        inMemory = true;
        continue;
      }
      if (inMemory && !line.startsWith(" ") && line.trim()) break;
      if (inMemory && line.includes("provider:")) {
        const val = line.split("provider:")[1].trim().replace(/['"]/g, "");
        if (val === "holographic" || val === "hindsight") return val;
        if (val && val !== "none") return "hindsight"; // Unknown providers assumed to be external
        return "none";
      }
    }
    return "none";
  } catch {
    return "none";
  }
}

/** Null provider for when no memory system is configured */
const nullProvider: MemoryProvider = {
  type: "none",
  async healthCheck() {
    return {
      available: false,
      provider: "none",
      message: "No memory provider configured. Run hermes memory setup to configure one.",
    };
  },
  async readFacts() {
    return {
      facts: [],
      total: 0,
      dbSize: 0,
      available: false,
      provider: "none",
      message: "No memory provider configured.",
    };
  },
  async addFact() {
    return { success: false, error: "No memory provider configured" };
  },
  async updateFact() {
    return { success: false, error: "No memory provider configured" };
  },
  async deleteFact() {
    return { success: false, error: "No memory provider configured" };
  },
};

/** Get the active memory provider based on config */
export function getMemoryProvider(): MemoryProvider {
  const configured = getConfiguredProvider();
  switch (configured) {
    case "holographic":
      return holographicProvider;
    case "hindsight":
      return hindsightProvider;
    default:
      return nullProvider;
  }
}

/** Get the configured provider type without instantiating */
export function getMemoryProviderType(): MemoryProviderType {
  return getConfiguredProvider();
}

/** Check if holographic DB exists (for backward compat) */
export function hasHolographicDb(): boolean {
  const dbPath = HERMES_HOME + "/memory_store.db";
  return existsSync(dbPath);
}

export type { MemoryProvider, MemoryProviderType } from "./types";
