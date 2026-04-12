/** @jest-environment node */
import { mkdtempSync, readFileSync, existsSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import {
  readJobsFile,
  withJobsFileLock,
} from "@/lib/jobs-repository";
import type { CronJobData } from "@/lib/utils";

describe("jobs-repository", () => {
  let dir: string;
  let cronPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mc-jobs-"));
    cronPath = dir + "/jobs.json";
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("readJobsFile returns empty when missing", () => {
    const r = readJobsFile(cronPath);
    expect(r.ok).toBe(true);
    expect(r.ok && r.jobs).toEqual([]);
  });

  it("readJobsFile fails on corrupt JSON without deleting", () => {
    writeFileSync(cronPath, "{not json", "utf-8");
    const r = readJobsFile(cronPath);
    expect(r.ok).toBe(false);
    expect(existsSync(cronPath)).toBe(true);
  });

  it("withJobsFileLock writes atomically and serializes", async () => {
    const backupDir = dir + "/backups";
    const job: CronJobData = {
      id: "a",
      name: "A",
      prompt: "p",
      skills: [],
      model: "m",
      schedule: { kind: "once", run_at: "2026-01-01T00:00:00Z", display: "once" },
      repeat: { times: 1, completed: 0 },
      enabled: true,
    };

    await Promise.all([
      withJobsFileLock(cronPath, backupDir, (jobs) => ({
        action: "write",
        jobs: [...jobs, job],
        value: 1,
      })),
      withJobsFileLock(cronPath, backupDir, (jobs) => ({
        action: "write",
        jobs: [
          ...jobs,
          { ...job, id: "b", name: "B" },
        ],
        value: 2,
      })),
    ]);

    const final = readJobsFile(cronPath);
    expect(final.ok).toBe(true);
    if (final.ok) {
      expect(final.jobs.length).toBe(2);
      expect(final.jobs.map((j) => j.id).sort()).toEqual(["a", "b"]);
    }
    const raw = readFileSync(cronPath, "utf-8");
    expect(raw).toContain('"jobs"');
    expect(JSON.parse(raw).jobs.length).toBe(2);
  });
});
