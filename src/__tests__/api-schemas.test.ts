import {
  hermesJobsFileSchema,
  missionPostBodySchema,
  cronPostBodySchema,
  cronPutBodySchema,
} from "@/lib/api-body-schemas";

describe("api-schemas Hermes jobs contract", () => {
  it("accepts minimal jobs.json shape Mission Control writes", () => {
    const parsed = hermesJobsFileSchema.safeParse({
      jobs: [
        {
          id: "test-job",
          name: "Test",
          prompt: "hello",
          skills: [],
          model: "gpt-4",
          schedule: { kind: "interval", minutes: 15, display: "every 15m" },
          schedule_display: "every 15m",
          repeat: { times: -1, completed: 0 },
          enabled: true,
          state: "scheduled",
          deliver: "none",
          script: null,
          created_at: "2026-01-01T00:00:00.000Z",
          next_run_at: null,
        },
      ],
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty jobs array root missing jobs key", () => {
    expect(hermesJobsFileSchema.safeParse({}).success).toBe(false);
  });
});

describe("api-schemas mission POST", () => {
  it("parses create payload", () => {
    const r = missionPostBodySchema.safeParse({
      action: "create",
      name: "N",
      dispatchMode: "save",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.action).toBe("create");
  });

  it("parses delete", () => {
    const r = missionPostBodySchema.safeParse({
      action: "delete",
      missionId: "m_abc",
    });
    expect(r.success).toBe(true);
  });
});

describe("api-schemas cron POST", () => {
  it("parses pauseAll", () => {
    const r = cronPostBodySchema.safeParse({ action: "pauseAll" });
    expect(r.success).toBe(true);
  });

  it("parses create job body", () => {
    const r = cronPostBodySchema.safeParse({
      name: "Job",
      schedule: "every 5m",
      prompt: "run",
    });
    expect(r.success).toBe(true);
  });
});

describe("api-schemas cron PUT", () => {
  it("parses pause action", () => {
    const r = cronPutBodySchema.safeParse({ id: "j1", action: "pause" });
    expect(r.success).toBe(true);
  });
});
