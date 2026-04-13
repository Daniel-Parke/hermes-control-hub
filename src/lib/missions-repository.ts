// ═══════════════════════════════════════════════════════════════
// MissionsRepository — mission JSON under control-hub/data/missions
// ═══════════════════════════════════════════════════════════════

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

import { parseMissionV1 } from "@agent-control-hub/schema";

import { PATHS } from "@/lib/hermes";
import type { Mission } from "@/types/hermes";

const DATA_DIR = PATHS.missions;

export function sanitizeMissionId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}

export function ensureMissionsDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadMission(id: string): Mission | null {
  const safe = sanitizeMissionId(id);
  if (!safe) return null;
  const path = DATA_DIR + "/" + safe + ".json";
  if (!existsSync(path)) return null;
  try {
    const raw: unknown = JSON.parse(readFileSync(path, "utf-8"));
    const parsed = parseMissionV1(raw);
    if (!parsed.ok) return null;
    return parsed.data as Mission;
  } catch {
    return null;
  }
}

export function saveMission(record: Mission): void {
  const parsed = parseMissionV1(record);
  if (!parsed.ok) {
    throw new Error("Mission record failed schema validation");
  }
  ensureMissionsDir();
  const safe = sanitizeMissionId(record.id);
  if (!safe) return;
  const path = DATA_DIR + "/" + safe + ".json";
  writeFileSync(path, JSON.stringify(record, null, 2));
}

export function getMissionsDataDir(): string {
  return DATA_DIR;
}
