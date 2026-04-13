import { getMcEditionFromEnv, type McEdition } from "@agent-control-hub/config";

export type Edition = McEdition;

/**
 * Server-side edition (Hermes OSS Simple vs commercial). Uses `MC_EDITION` / `NEXT_PUBLIC_MC_EDITION`.
 */
export function getEdition(): Edition {
  return getMcEditionFromEnv();
}

export function isCommercialEdition(): boolean {
  return getEdition() === "commercial";
}
