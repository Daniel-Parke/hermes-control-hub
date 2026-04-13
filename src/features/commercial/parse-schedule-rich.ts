import type { ParsedSchedule } from "@/lib/schedule/types";

/** OSS stub: rich intervals are not available in Simple edition. */
export function tryParseRichInterval(_raw: string): ParsedSchedule | null {
  void _raw;
  return null;
}
