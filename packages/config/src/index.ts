/**
 * Deployment profile for future hosted / central features (reserved).
 */
export type DeploymentMode = "local" | "hosted";

export type McEdition = "simple" | "commercial";

/**
 * Read MC edition from server-side environment.
 */
export function getMcEditionFromEnv(
  env: NodeJS.ProcessEnv = process.env
): McEdition {
  const v = (env.MC_EDITION || env.NEXT_PUBLIC_MC_EDITION || "simple").toLowerCase();
  return v === "commercial" ? "commercial" : "simple";
}

/**
 * Client-safe edition when bundled with NEXT_PUBLIC_MC_EDITION at build time.
 */
export function getPublicMcEdition(): McEdition {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_MC_EDITION) {
    return process.env.NEXT_PUBLIC_MC_EDITION === "commercial" ? "commercial" : "simple";
  }
  if (typeof window !== "undefined") {
    const w = window as unknown as { __MC_EDITION__?: string };
    if (w.__MC_EDITION__ === "commercial") return "commercial";
  }
  return "simple";
}

export function getDeploymentMode(env: NodeJS.ProcessEnv = process.env): DeploymentMode {
  const v = (env.AC_DEPLOYMENT_MODE || "local").toLowerCase();
  return v === "hosted" ? "hosted" : "local";
}

export interface McEnvSummary {
  hermesHome: string | undefined;
  mcDataDir: string | undefined;
  mcApiKeySet: boolean;
  acLicenseKeySet: boolean;
  edition: McEdition;
  deploymentMode: DeploymentMode;
}

/**
 * Non-secret summary for diagnostics (never log raw secrets).
 */
export function summarizeMcEnv(env: NodeJS.ProcessEnv = process.env): McEnvSummary {
  return {
    hermesHome: env.HERMES_HOME,
    mcDataDir: env.MC_DATA_DIR,
    mcApiKeySet: Boolean(env.MC_API_KEY && env.MC_API_KEY.length > 0),
    acLicenseKeySet: Boolean(env.AC_LICENSE_KEY && env.AC_LICENSE_KEY.length > 0),
    edition: getMcEditionFromEnv(env),
    deploymentMode: getDeploymentMode(env),
  };
}
