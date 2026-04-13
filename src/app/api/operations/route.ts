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
import type { OperationRecord, OperationStep } from "@/types/hermes";

const OPS_DIR = PATHS.operations;

function ensureOpsDir() {
  if (!existsSync(OPS_DIR)) mkdirSync(OPS_DIR, { recursive: true });
}

function sanitizeOpId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}

function loadOperation(id: string): OperationRecord | null {
  const safe = sanitizeOpId(id);
  if (!safe) return null;
  const p = OPS_DIR + "/" + safe + ".json";
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as OperationRecord;
  } catch {
    return null;
  }
}

function saveOperation(rec: OperationRecord) {
  ensureOpsDir();
  const safe = sanitizeOpId(rec.id);
  if (!safe) return;
  writeFileSync(OPS_DIR + "/" + safe + ".json", JSON.stringify(rec, null, 2));
}

// GET /api/operations — list or ?id= single
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      const op = loadOperation(id);
      if (!op) {
        return NextResponse.json({ error: "Operation not found" }, { status: 404 });
      }
      return NextResponse.json({ data: { operation: op } });
    }

    ensureOpsDir();
    const files = existsSync(OPS_DIR)
      ? readdirSync(OPS_DIR).filter((f) => f.endsWith(".json"))
      : [];
    const operations: OperationRecord[] = [];
    for (const f of files) {
      try {
        const raw = readFileSync(OPS_DIR + "/" + f, "utf-8");
        operations.push(JSON.parse(raw) as OperationRecord);
      } catch {
        // skip corrupt
      }
    }
    operations.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return NextResponse.json({
      data: { operations, total: operations.length },
    });
  } catch (error) {
    logApiError("GET /api/operations", "list", error);
    return NextResponse.json(
      { error: "Failed to list operations" },
      { status: 500 }
    );
  }
}

// POST /api/operations — create
export async function POST(request: NextRequest) {
  const ro = requireNotReadOnly();
  if (ro) return ro;
  const auth = requireMcApiKey(request);
  if (auth) return auth;

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const rawSteps = Array.isArray(body.steps) ? body.steps : [];

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const id =
      "op_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    const steps: OperationStep[] = rawSteps.map(
      (s: Record<string, unknown>, i: number) => {
        const title =
          typeof s.title === "string" && s.title.trim()
            ? s.title.trim()
            : "Step " + (i + 1);
        return {
          id: "s_" + i + "_" + Date.now().toString(36),
          title,
          missionTemplateId:
            typeof s.missionTemplateId === "string"
              ? s.missionTemplateId
              : undefined,
          profile: typeof s.profile === "string" ? s.profile : undefined,
          model: typeof s.model === "string" ? s.model : undefined,
          notes: typeof s.notes === "string" ? s.notes : undefined,
          status: "pending" as const,
          updatedAt: now,
        };
      }
    );

    const rec: OperationRecord = {
      id,
      name,
      description,
      steps,
      currentStepIndex: 0,
      status: steps.length === 0 ? "draft" : "draft",
      createdAt: now,
      updatedAt: now,
    };

    saveOperation(rec);
    appendAuditLine({
      action: "operations.create",
      resource: id,
      ok: true,
    });
    return NextResponse.json({ data: { operation: rec } });
  } catch (error) {
    logApiError("POST /api/operations", "create", error);
    return NextResponse.json(
      { error: "Failed to create operation" },
      { status: 500 }
    );
  }
}
