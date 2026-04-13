"use client";

import { getPublicChEdition } from "@agent-control-hub/config";
import CronPageCommercial from "./cron-page-commercial";
import CronPageOss from "./cron-page-oss";

const isCommercial = getPublicChEdition() === "commercial";

export default function CronPage() {
  if (isCommercial) return <CronPageCommercial />;
  return <CronPageOss />;
}
