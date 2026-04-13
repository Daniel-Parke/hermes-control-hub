"use client";

import CronPageOss from "./cron-page-oss";

/**
 * Commercial shell: wraps OSS cron UI; extend with premium scheduling UX (mc-pro) when needed.
 */
export default function CronPageCommercial() {
  return <CronPageOss />;
}
