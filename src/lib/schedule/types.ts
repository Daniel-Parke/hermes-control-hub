/** Result of parsing a schedule string for Hermes `jobs.json` (see nested Hermes `parse_schedule`). */
export type ParsedSchedule =
  | { kind: "interval"; minutes: number; display: string }
  | { kind: "cron"; expr: string; display: string }
  | { kind: "once"; run_at: string; display: string }
  | { kind: "invalid"; raw: string; message: string };
