import { z } from "zod";
/** Semantic version of the mission JSON contract (Mission Control + Hermes file on disk). */
export declare const MISSION_SCHEMA_VERSION: "1.0.0";
export declare const missionStatusSchema: z.ZodEnum<{
    queued: "queued";
    dispatched: "dispatched";
    successful: "successful";
    failed: "failed";
}>;
export declare const dispatchModeSchema: z.ZodEnum<{
    save: "save";
    now: "now";
    cron: "cron";
}>;
/**
 * Mission record as persisted under MC_DATA_DIR/missions/{id}.json.
 * Commercial-only fields may appear under `extensions` and must be ignored by OSS validators.
 */
export declare const missionV1Schema: z.ZodObject<{
    schemaVersion: z.ZodOptional<z.ZodLiteral<"1.0.0">>;
    id: z.ZodString;
    name: z.ZodString;
    prompt: z.ZodString;
    goals: z.ZodArray<z.ZodString>;
    skills: z.ZodArray<z.ZodString>;
    model: z.ZodString;
    profile: z.ZodString;
    missionTimeMinutes: z.ZodNumber;
    timeoutMinutes: z.ZodNumber;
    schedule: z.ZodString;
    templateId: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<{
        queued: "queued";
        dispatched: "dispatched";
        successful: "successful";
        failed: "failed";
    }>;
    dispatchMode: z.ZodEnum<{
        save: "save";
        now: "now";
        cron: "cron";
    }>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    results: z.ZodNullable<z.ZodString>;
    duration: z.ZodNullable<z.ZodNumber>;
    error: z.ZodNullable<z.ZodString>;
    cronJobId: z.ZodOptional<z.ZodString>;
    cronJob: z.ZodOptional<z.ZodObject<{
        state: z.ZodString;
        enabled: z.ZodBoolean;
        lastRun: z.ZodNullable<z.ZodString>;
        lastStatus: z.ZodNullable<z.ZodString>;
        schedule: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    extensions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$loose>;
export type MissionV1 = z.infer<typeof missionV1Schema>;
export declare function parseMissionV1(input: unknown): {
    ok: true;
    data: MissionV1;
} | {
    ok: false;
    error: z.ZodError;
};
//# sourceMappingURL=mission-v1.d.ts.map