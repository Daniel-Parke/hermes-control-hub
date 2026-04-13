// ═══════════════════════════════════════════════════════════════
// jobs.json — serialized mutations + atomic write (Hermes-compatible)
// ═══════════════════════════════════════════════════════════════
// Mirrors hermes-agent/cron/jobs.py save_jobs: temp file, fsync, rename.
// In-process mutex only; Hermes on same host may still interleave — documented.

import {
  closeSync,
  copyFileSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeSync,
} from "fs";

import type { CronJobData } from "@/lib/utils";

export type JobsReadResult =
  | { ok: true; jobs: CronJobData[]; updated_at?: string }
  | { ok: false; error: string };

/** Read jobs.json without writing. Corrupt/missing jobs key → not ok. */
export function readJobsFile(cronPath: string): JobsReadResult {
  if (!existsSync(cronPath)) {
    return { ok: true, jobs: [] };
  }
  try {
    const raw = readFileSync(cronPath, "utf-8");
    const data = JSON.parse(raw) as { jobs?: unknown; updated_at?: string };
    if (Array.isArray(data.jobs)) {
      return {
        ok: true,
        jobs: data.jobs as CronJobData[],
        updated_at: data.updated_at,
      };
    }
    if (Array.isArray(data)) {
      return { ok: true, jobs: data as CronJobData[] };
    }
    return { ok: false, error: "jobs.json: missing or invalid jobs array" };
  } catch {
    return { ok: false, error: "Invalid or corrupt jobs.json" };
  }
}

function atomicWriteJobsFile(
  cronPath: string,
  jobs: CronJobData[],
  backupsDir: string | null
): void {
  const dir =
    cronPath.lastIndexOf("/") >= 0
      ? cronPath.slice(0, cronPath.lastIndexOf("/"))
      : ".";
  mkdirSync(dir, { recursive: true });

  if (backupsDir && existsSync(cronPath)) {
    mkdirSync(backupsDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = backupsDir + "/cron-jobs." + stamp + ".bak";
    try {
      copyFileSync(cronPath, backupPath);
    } catch {
      // best-effort backup
    }
  }

  const payload = {
    jobs,
    updated_at: new Date().toISOString(),
  };
  const content = JSON.stringify(payload, null, 2);
  const tmp = dir + "/.jobs_ch_" + process.pid + "_" + Date.now() + ".tmp";
  const fd = openSync(tmp, "w", 0o600);
  try {
    writeSync(fd, content, 0, "utf-8");
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  try {
    renameSync(tmp, cronPath);
  } catch (err) {
    try {
      unlinkSync(tmp);
    } catch {
      // ignore
    }
    throw err;
  }
}

export type JobsMutateResult<T> =
  | { action: "write"; jobs: CronJobData[]; value: T }
  | { action: "abort"; error: string };

let mutexChain: Promise<void> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = mutexChain.then(() => fn());
  mutexChain = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

/**
 * Serialize read-modify-write to jobs.json. Use for all CH mutations.
 */
export async function withJobsFileLock<T>(
  cronPath: string,
  backupsDir: string | null,
  mutate: (jobs: CronJobData[]) => JobsMutateResult<T>
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  return enqueue(async () => {
    const read = readJobsFile(cronPath);
    if (!read.ok) {
      return { ok: false, error: read.error };
    }
    const out = mutate(read.jobs);
    if (out.action === "abort") {
      return { ok: false, error: out.error };
    }
    try {
      atomicWriteJobsFile(cronPath, out.jobs, backupsDir);
    } catch {
      return { ok: false, error: "Failed to write jobs.json" };
    }
    return { ok: true, value: out.value };
  });
}

/** Read-only path for handlers that must not queue (e.g. high-frequency GET). */
export function readJobsFileOrEmpty(cronPath: string): CronJobData[] {
  const r = readJobsFile(cronPath);
  return r.ok ? r.jobs : [];
}
