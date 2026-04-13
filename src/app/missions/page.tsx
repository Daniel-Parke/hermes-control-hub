"use client";

import MissionsPageCommercial from "./missions-page-commercial";
import MissionsPageOss from "./missions-page-oss";

const isCommercial =
  typeof process.env.NEXT_PUBLIC_MC_EDITION === "string" &&
  process.env.NEXT_PUBLIC_MC_EDITION.toLowerCase() === "commercial";

export default function MissionsPage() {
  if (isCommercial) return <MissionsPageCommercial />;
  return <MissionsPageOss />;
}
