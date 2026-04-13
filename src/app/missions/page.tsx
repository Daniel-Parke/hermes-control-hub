"use client";

import { getPublicChEdition } from "@agent-control-hub/config";
import MissionsPageCommercial from "./missions-page-commercial";
import MissionsPageOss from "./missions-page-oss";

const isCommercial = getPublicChEdition() === "commercial";

export default function MissionsPage() {
  if (isCommercial) return <MissionsPageCommercial />;
  return <MissionsPageOss />;
}
