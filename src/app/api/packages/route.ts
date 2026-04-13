import { NextRequest, NextResponse } from "next/server";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "fs";

import { PATHS } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";
import { requireMcApiKey, requireNotReadOnly } from "@/lib/api-auth";
import { appendAuditLine } from "@/lib/audit-log";
import type { PackageBundle } from "@/types/hermes";

const DIR = PATHS.packages;

function ensureDir() {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
}

// GET /api/packages — list bundles
export async function GET() {
  try {
    ensureDir();
    const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
    const packages: PackageBundle[] = [];
    for (const f of files) {
      try {
        packages.push(
          JSON.parse(readFileSync(DIR + "/" + f, "utf-8")) as PackageBundle
        );
      } catch {
        // skip
      }
    }
    packages.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return NextResponse.json({ data: { packages, total: packages.length } });
  } catch (error) {
    logApiError("GET /api/packages", "list", error);
    return NextResponse.json(
      { error: "Failed to list packages" },
      { status: 500 }
    );
  }
}

// POST /api/packages — save a bundle JSON (export from UI or external tool)
export async function POST(request: NextRequest) {
  const ro = requireNotReadOnly();
  if (ro) return ro;
  const auth = requireMcApiKey(request);
  if (auth) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const id =
      "pkg_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const bundle: PackageBundle = {
      id,
      name,
      version: typeof body.version === "string" ? body.version : "1.0.0",
      createdAt: now,
      missionTemplateIds: Array.isArray(body.missionTemplateIds)
        ? body.missionTemplateIds.map(String)
        : [],
      taskListIds: Array.isArray(body.taskListIds)
        ? body.taskListIds.map(String)
        : [],
      profileNames: Array.isArray(body.profileNames)
        ? body.profileNames.map(String)
        : [],
      notes: typeof body.notes === "string" ? body.notes : undefined,
    };
    ensureDir();
    writeFileSync(DIR + "/" + id + ".json", JSON.stringify(bundle, null, 2));
    appendAuditLine({ action: "packages.create", resource: id, ok: true });
    return NextResponse.json({ data: { package: bundle } });
  } catch (error) {
    logApiError("POST /api/packages", "create", error);
    return NextResponse.json(
      { error: "Failed to save package" },
      { status: 500 }
    );
  }
}
