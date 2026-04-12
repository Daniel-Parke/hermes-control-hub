// ═══════════════════════════════════════════════════════════════
// Zod schemas for API request bodies (no next/server — safe in Jest)
// ═══════════════════════════════════════════════════════════════

import { z } from "zod";

const nonEmpty = z.string().min(1);

/** Hermes-style schedule object (minimal contract for tests and validation). */
export const hermesScheduleObjectSchema = z
  .object({
    kind: z.string(),
    minutes: z.number().optional(),
    expr: z.string().optional(),
    run_at: z.string().optional(),
    display: z.string().optional(),
  })
  .passthrough();

/** Single persisted cron job shape aligned with Hermes `jobs.json` entries. */
export const hermesCronJobRecordSchema = z
  .object({
    id: nonEmpty,
    name: nonEmpty,
    prompt: z.string(),
    skills: z.array(z.string()),
    model: z.string(),
    schedule: z.union([hermesScheduleObjectSchema, z.string()]),
    schedule_display: z.string().optional(),
    repeat: z.union([
      z.object({
        times: z.number().nullable(),
        completed: z.number(),
      }),
      z.boolean(),
    ]),
    enabled: z.boolean(),
    state: z.string().optional(),
    deliver: z.string().optional(),
    script: z.string().nullable().optional(),
    created_at: z.string().optional(),
    next_run_at: z.string().nullable().optional(),
    last_run_at: z.string().nullable().optional(),
    last_status: z.string().nullable().optional(),
    mission_id: z.string().optional(),
    provider: z.string().optional(),
    profile: z.string().optional(),
    timeout: z.number().optional(),
  })
  .passthrough();

export const hermesJobsFileSchema = z.object({
  jobs: z.array(hermesCronJobRecordSchema),
  updated_at: z.string().optional(),
});

export type HermesJobsFile = z.infer<typeof hermesJobsFileSchema>;

export const cronPostBodySchema = z.union([
  z.object({ action: z.literal("pauseAll") }),
  z.object({
    name: nonEmpty,
    schedule: nonEmpty,
    prompt: nonEmpty,
    deliver: z.string().optional(),
    model: z.string().optional(),
    repeat: z.boolean().optional(),
    skills: z.array(z.string()).optional(),
    script: z.union([z.string(), z.null()]).optional(),
  }),
]);

export type CronPostBody = z.infer<typeof cronPostBodySchema>;

export const cronPutBodySchema = z.object({
  id: nonEmpty,
  action: z.enum(["pause", "resume", "run"]).optional(),
  name: z.string().optional(),
  prompt: z.string().optional(),
  skills: z.array(z.string()).optional(),
  model: z.string().optional(),
  deliver: z.string().optional(),
  enabled: z.boolean().optional(),
  schedule: z.string().optional(),
  schedule_display: z.string().optional(),
});

export type CronPutBody = z.infer<typeof cronPutBodySchema>;

export const missionPostBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    name: z.string().optional(),
    prompt: z.string().optional(),
    goals: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
    model: z.string().optional(),
    profile: z.string().optional(),
    missionTimeMinutes: z.number().optional(),
    timeoutMinutes: z.number().optional(),
    schedule: z.string().optional(),
    dispatchMode: z.enum(["save", "now", "cron"]).optional(),
    templateId: z.string().optional(),
  }),
  z.object({
    action: z.literal("delete"),
    missionId: nonEmpty,
  }),
  z.object({
    action: z.literal("cancel"),
    missionId: nonEmpty,
  }),
  z.object({
    action: z.literal("update"),
    missionId: nonEmpty,
    name: z.string().optional(),
    prompt: z.string().optional(),
    goals: z.array(z.string()).optional(),
    profile: z.string().optional(),
    missionTimeMinutes: z.number().optional(),
    timeoutMinutes: z.number().optional(),
    schedule: z.string().optional(),
  }),
]);

export type MissionPostBody = z.infer<typeof missionPostBodySchema>;
