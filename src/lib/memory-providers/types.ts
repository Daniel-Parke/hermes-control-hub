// ═══════════════════════════════════════════════════════════════
// Memory Provider Abstraction — Shared Types
// ═══════════════════════════════════════════════════════════════

/** Supported memory provider types */
export type MemoryProviderType = "holographic" | "hindsight" | "none";

/** A single memory fact from any provider */
export interface MemoryFact {
  id: number;
  content: string;
  category: string;
  tags: string;
  trust: number;
  createdAt: string;
  updatedAt: string;
}

/** Memory bank info (Holographic-specific but generic enough) */
export interface MemoryBank {
  bank_name: string;
  fact_count: number;
  updated_at: string;
}

/** Response from reading memory facts */
export interface MemoryReadResult {
  facts: MemoryFact[];
  total: number;
  dbSize: number;
  available: boolean;
  provider: MemoryProviderType;
  message?: string;
  entities?: number;
  banks?: MemoryBank[];
}

/** Response from adding a fact */
export interface MemoryAddResult {
  success: boolean;
  fact?: MemoryFact;
  error?: string;
}

/** Response from updating a fact */
export interface MemoryUpdateResult {
  success: boolean;
  id?: number;
  error?: string;
}

/** Response from deleting a fact */
export interface MemoryDeleteResult {
  success: boolean;
  id?: number;
  error?: string;
}

/** Provider health status */
export interface MemoryProviderHealth {
  available: boolean;
  provider: MemoryProviderType;
  message: string;
  factCount?: number;
  dbSize?: number;
}

/** Fact input for adding */
export interface FactInput {
  content: string;
  category?: string;
  tags?: string;
  trust_score?: number;
}

/** Fact input for updating */
export interface FactUpdateInput {
  id: number;
  content?: string;
  category?: string;
  tags?: string;
  trust_score?: number;
}

/** Memory provider interface — all providers must implement this */
export interface MemoryProvider {
  /** Provider type identifier */
  readonly type: MemoryProviderType;

  /** Check if this provider is available and healthy */
  healthCheck(): Promise<MemoryProviderHealth>;

  /** Read facts with optional search/filter */
  readFacts(options?: {
    search?: string;
    category?: string;
    limit?: number;
  }): Promise<MemoryReadResult>;

  /** Add a new fact */
  addFact(input: FactInput): Promise<MemoryAddResult>;

  /** Update an existing fact */
  updateFact(input: FactUpdateInput): Promise<MemoryUpdateResult>;

  /** Delete a fact by ID */
  deleteFact(id: number): Promise<MemoryDeleteResult>;
}
