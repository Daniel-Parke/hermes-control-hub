"use client";

import CronPageCommercial from "./cron-page-commercial";
import CronPageOss from "./cron-page-oss";

const isCommercial =
  typeof process.env.NEXT_PUBLIC_MC_EDITION === "string" &&
  process.env.NEXT_PUBLIC_MC_EDITION.toLowerCase() === "commercial";

export default function CronPage() {
  if (isCommercial) return <CronPageCommercial />;
  return <CronPageOss />;
}
