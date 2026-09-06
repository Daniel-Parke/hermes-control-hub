// ═══════════════════════════════════════════════════════════════
// memory-providers/unavailable-provider.ts — active, but nothing here can serve it
//
// The registry used to return a Hindsight client for EVERY provider type,
// because its `default:` branch was a hindsight alias. That made a provider
// switch structurally unobservable, and a type nobody had implemented yet would
// quietly talk to Hindsight's endpoint while claiming to be itself (T-0077).
//
// This is what the registry returns instead. It reports the type the DATABASE
// says is active — not "none" — because that is the truth: the operator did
// select holographic, and what is missing is a client, not a selection. Callers
// asking "which provider is active" get the right answer; callers trying to USE
// it get a refusal that names the type rather than a silent connection to
// somebody else's backend.
// ═══════════════════════════════════════════════════════════════

import { memoryUnavailableMessage } from "../memory-error-copy";
import type {
  MemoryHealth,
  MemoryProvider,
  MemoryProviderType,
  MemoryStats,
} from "./types";

export class UnavailableMemoryProvider implements MemoryProvider {
  readonly type: MemoryProviderType;
  readonly baseUrl = "";

  constructor(type: MemoryProviderType = "none") {
    this.type = type;
  }

  /**
   * What happened, then what to do about it.
   *
   * The sentences live in @/lib/memory/memory-error-copy because three
   * surfaces read them (the store toast, the health banner, the dashboard's
   * Memory row) and because the banner has to recognise them: it renders
   * INSIDE the memory provider card, and it used to reprint this as
   * "Hindsight: <sentence>" over an install with no Hindsight in it.
   */
  private reason(): string {
    return memoryUnavailableMessage(this.type);
  }

  bankBase(): string {
    return "";
  }

  async request<T = Record<string, unknown>>(): Promise<T> {
    // The message travels: the route puts it on the wire and the client toasts
    // it, so this string is user-facing copy, not a developer note.
    throw new Error(this.reason());
  }

  async health(): Promise<MemoryHealth> {
    return { available: false, error: this.reason() };
  }

  async stats(): Promise<MemoryStats> {
    return { available: false, factCount: 0 };
  }
}
