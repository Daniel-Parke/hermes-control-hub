export type DeploymentMode = "local" | "hosted";

export type ChEdition = "oss";

function firstNonEmptyEnv(
  env: NodeJS.ProcessEnv,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = env[key];
    if (value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return undefined;
}

export function getChEditionFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ChEdition {
  void firstNonEmptyEnv(env, ["CH_EDITION", "NEXT_PUBLIC_CH_EDITION"]);
  return "oss";
}

export function getPublicChEdition(): ChEdition {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_CH_EDITION !== undefined) {
    return "oss";
  }

  if (typeof window !== "undefined") {
    const win = window as unknown as { __CH_EDITION__?: string };
    void win.__CH_EDITION__;
  }

  return "oss";
}

export function getDeploymentMode(
  env: NodeJS.ProcessEnv = process.env,
): DeploymentMode {
  const value = (env.AC_DEPLOYMENT_MODE ?? "local").toLowerCase();
  return value === "hosted" ? "hosted" : "local";
}

export interface ChEnvSummary {
  hermesHome: string | undefined;
  chDataDir: string | undefined;
  chApiKeySet: boolean;
  edition: ChEdition;
  deploymentMode: DeploymentMode;
}

export function getChApiKeyFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return (firstNonEmptyEnv(env, ["CH_API_KEY"]) ?? "").trim();
}

export function summarizeChEnv(
  env: NodeJS.ProcessEnv = process.env,
): ChEnvSummary {
  const apiKey = getChApiKeyFromEnv(env);
  return {
    hermesHome: env.HERMES_HOME,
    chDataDir: firstNonEmptyEnv(env, ["CH_DATA_DIR"]),
    chApiKeySet: apiKey.length > 0,
    edition: getChEditionFromEnv(env),
    deploymentMode: getDeploymentMode(env),
  };
}
