// ═══════════════════════════════════════════════════════════════

// Optional API auth + feature flags for Command Hub

// ═══════════════════════════════════════════════════════════════



import { getChApiKeyFromEnv, getChEditionFromEnv } from "@agent-control-hub/config";

import { NextRequest, NextResponse } from "next/server";



import { isCommercialLicenseValid } from "@/lib/commercial-license";



function firstEnvFlag(keys: string[]): string | undefined {

  for (const k of keys) {

    const v = process.env[k];

    if (v !== undefined && String(v).trim() !== "") return String(v).trim();

  }

  return undefined;

}



/** When set, mutating routes require this key (header X-CH-API-Key, legacy X-CH-API-Key, or Authorization: Bearer). */

export function getMcApiKey(): string {

  return getChApiKeyFromEnv();

}



/**

 * Deploy/update API. In production, requires CH_ENABLE_DEPLOY_API or CH_ENABLE_DEPLOY_API=true.

 * In non-production, defaults to enabled unless explicitly set to "false".

 */

export function isDeployApiEnabled(): boolean {

  const raw = firstEnvFlag(["CH_ENABLE_DEPLOY_API", "CH_ENABLE_DEPLOY_API"]);

  const v = raw?.toLowerCase();

  if (v === "1" || v === "true" || v === "yes") return true;

  if (v === "0" || v === "false" || v === "no") return false;

  return process.env.NODE_ENV === "production" ? false : true;

}



/** Read-only mode: block writes (except GET). */

export function isMcReadOnly(): boolean {

  const raw = firstEnvFlag(["CH_READ_ONLY", "CH_READ_ONLY"]);

  const v = raw?.toLowerCase();

  return v === "1" || v === "true";

}



/**

 * Returns 401 response if an API key is set and request lacks a valid key.

 * Returns null if authorized or auth disabled.

 */

export function requireMcApiKey(request: NextRequest): NextResponse | null {

  const key = getMcApiKey();

  if (!key) return null;



  const header =

    request.headers.get("x-ch-api-key") ||

    request.headers.get("x-ch-api-key") ||

    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||

    "";



  if (header !== key) {

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  }

  return null;

}



export function requireNotReadOnly(): NextResponse | null {

  if (isMcReadOnly()) {

    return NextResponse.json(

      {

        error:

          "Command Hub is in read-only mode (set CH_READ_ONLY or legacy CH_READ_ONLY)",

      },

      { status: 503 }

    );

  }

  return null;

}



export function requireDeployApiEnabled(): NextResponse | null {

  if (!isDeployApiEnabled()) {

    return NextResponse.json(

      {

        error:

          "Deploy API disabled. Set CH_ENABLE_DEPLOY_API=true (or legacy CH_ENABLE_DEPLOY_API) to allow update/restart.",

      },

      { status: 403 }

    );

  }

  return null;

}



/**

 * When edition is commercial, mutating commercial-only APIs require a valid Ed25519 license

 * (`AC_LICENSE_KEY` + `AC_LICENSE_ED25519_PUBLIC_PEM`) in addition to optional API key.

 */

export function requireCommercialLicense(): NextResponse | null {

  if (getChEditionFromEnv() !== "commercial") return null;

  if (isCommercialLicenseValid()) return null;

  return NextResponse.json(

    {

      error:

        "Commercial license required or invalid. Set AC_LICENSE_KEY and AC_LICENSE_ED25519_PUBLIC_PEM.",

    },

    { status: 403 }

  );

}

