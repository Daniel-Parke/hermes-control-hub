// ═══════════════════════════════════════════════════════════════
// Hindsight Memory Provider — API client for local Hindsight server
// ═══════════════════════════════════════════════════════════════
//
// Communicates with a local Hindsight instance via HTTP API.
// Supports local_embedded and local_external modes.
//
// Hindsight API endpoints (inferred from plugin code):
//   POST /recall  — search memories
//   POST /retain  — store a memory
//   POST /reflect — reason across memories
//   GET  /banks   — list memory banks
//   GET  /health  — health check

import { logApiError } from "@/lib/api-logger";
import type {
  MemoryProvider,
  MemoryProviderHealth,
  MemoryReadResult,
  MemoryAddResult,
  MemoryUpdateResult,
  MemoryDeleteResult,
  FactInput,
  FactUpdateInput,
  MemoryFact,
} from "./types";

/** Load Hindsight config from ~/.hermes/hindsight/config.json or env vars */
async function getHindsightConfig(): Promise<{
  mode: string;
  apiUrl: string;
  apiKey: string;
  bankId: string;
}> {
  const { readFileSync, existsSync } = await import("fs");
  const { HERMES_HOME } = await import("@/lib/hermes");

  // Try profile-scoped config first
  const profilePath = HERMES_HOME + "/hindsight/config.json";
  const legacyPath =
    (process.env.HOME || "") + "/.hindsight/config.json";

  let config: Record<string, unknown> = {};

  for (const path of [profilePath, legacyPath]) {
    if (existsSync(path)) {
      try {
        config = JSON.parse(readFileSync(path, "utf-8"));
        break;
      } catch {
        // Continue to next path
      }
    }
  }

  const banks = config.banks as Record<string, Record<string, unknown>> | undefined;
  const hermesBank = banks?.hermes;

  return {
    mode: (config.mode as string) || process.env.HINDSIGHT_MODE || "local_embedded",
    apiUrl:
      (config.api_url as string) ||
      process.env.HINDSIGHT_API_URL ||
      "http://localhost:8888",
    apiKey: (config.api_key as string) || process.env.HINDSIGHT_API_KEY || "",
    bankId:
      (hermesBank?.bank_id as string) ||
      process.env.HINDSIGHT_BANK_ID ||
      "hermes",
  };
}

/** Make an authenticated API call to Hindsight */
async function hindsightApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const config = await getHindsightConfig();
  const url = config.apiUrl.replace(/\/$/, "") + endpoint;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(`Hindsight API error ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

export const hindsightProvider: MemoryProvider = {
  type: "hindsight",

  async healthCheck(): Promise<MemoryProviderHealth> {
    try {
      const config = await getHindsightConfig();
      const url = config.apiUrl.replace(/\/$/, "") + "/health";

      const headers: Record<string, string> = {};
      if (config.apiKey) {
        headers["Authorization"] = `Bearer ${config.apiKey}`;
      }

      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return {
          available: false,
          provider: "hindsight",
          message: `Hindsight server returned ${response.status}`,
        };
      }

      const data = await response.json().catch(() => ({}));
      return {
        available: true,
        provider: "hindsight",
        message: `Hindsight ${config.mode} mode — bank: ${config.bankId}`,
        factCount: (data as Record<string, unknown>).fact_count as number | undefined,
      };
    } catch (error) {
      return {
        available: false,
        provider: "hindsight",
        message: `Hindsight unavailable: ${error instanceof Error ? error.message : "Connection failed"}`,
      };
    }
  },

  async readFacts(options): Promise<MemoryReadResult> {
    try {
      // Use recall endpoint to search for facts
      const searchQuery = options?.search || "all facts recent";
      const config = await getHindsightConfig();

      const result = await hindsightApi<{
        memories?: Array<{
          id?: string;
          content?: string;
          metadata?: Record<string, unknown>;
          score?: number;
          created_at?: string;
          updated_at?: string;
        }>;
        count?: number;
      }>("/recall", {
        method: "POST",
        body: JSON.stringify({
          query: searchQuery,
          bank_id: config.bankId,
          limit: options?.limit ?? 200,
        }),
      });

      const facts: MemoryFact[] = (result.memories || []).map((m, i) => ({
        id: i + 1,
        content: m.content || "",
        category: (m.metadata?.category as string) || "general",
        tags: (m.metadata?.tags as string) || "",
        trust: m.score ?? 0.5,
        createdAt: m.created_at || new Date().toISOString(),
        updatedAt: m.updated_at || new Date().toISOString(),
      }));

      return {
        facts,
        total: result.count ?? facts.length,
        dbSize: 0,
        available: true,
        provider: "hindsight",
        message: `${facts.length} memories retrieved from Hindsight`,
      };
    } catch (error) {
      logApiError("GET /api/memory", "hindsight readFacts", error);
      return {
        facts: [],
        total: 0,
        dbSize: 0,
        available: false,
        provider: "hindsight",
        message: `Hindsight error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },

  async addFact(input: FactInput): Promise<MemoryAddResult> {
    try {
      const config = await getHindsightConfig();
      const result = await hindsightApi<{
        success?: boolean;
        memory_id?: string;
      }>("/retain", {
        method: "POST",
        body: JSON.stringify({
          content: input.content,
          bank_id: config.bankId,
          metadata: {
            category: input.category ?? "general",
            tags: input.tags ?? "",
          },
        }),
      });

      if (result.success !== false) {
        return {
          success: true,
          fact: {
            id: Date.now(),
            content: input.content.trim(),
            category: input.category ?? "general",
            tags: input.tags ?? "",
            trust: input.trust_score ?? 0.7,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };
      }
      return { success: false, error: "Hindsight retain returned failure" };
    } catch (error) {
      return {
        success: false,
        error: `Hindsight retain error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },

  async updateFact(input: FactUpdateInput): Promise<MemoryUpdateResult> {
    // Hindsight doesn't have a direct update API — store new + delete old
    // For now, return a message indicating this limitation
    if (input.content) {
      const addResult = await this.addFact({
        content: input.content,
        category: input.category,
        tags: input.tags,
        trust_score: input.trust_score,
      });
      if (addResult.success) {
        return { success: true, id: input.id };
      }
    }
    return {
      success: false,
      error: "Hindsight does not support direct fact updates. Add a new fact instead.",
    };
  },

  async deleteFact(id: number): Promise<MemoryDeleteResult> {
    // Hindsight doesn't expose a delete API in the standard client
    return {
      success: false,
      error:
        "Hindsight does not support direct fact deletion through the API. Facts are managed by the Hindsight server.",
    };
  },
};
