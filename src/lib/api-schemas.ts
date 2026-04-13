// ═══════════════════════════════════════════════════════════════
// API schemas + NextResponse helper for routes
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { z } from "zod";

export {
  type CronPostBody,
  type CronPutBody,
  type HermesJobsFile,
  type MissionPostBody,
  cronPostBodySchema,
  cronPutBodySchema,
  hermesCronJobRecordSchema,
  hermesJobsFileSchema,
  hermesScheduleObjectSchema,
  missionPostBodySchema,
} from "@/lib/api-body-schemas";

export function zodErrorResponse(error: z.ZodError): NextResponse {
  return NextResponse.json(
    {
      error: "Invalid request body",
      details: error.flatten(),
    },
    { status: 400 }
  );
}
