import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs";

import { PATHS } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";
import { requireMcApiKey, requireNotReadOnly } from "@/lib/api-auth";
import { appendAuditLine } from "@/lib/audit-log";
import type { OperationRecord } from "@/types/hermes";

const OPS_DIR = PATHS.operations;

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
  const safe = sanitizeOpId(rec.id);
  if (!safe) return;
  writeFileSync(OPS_DIR + "/" + safe + ".json", JSON.stringify(rec, null, 2));
}

// GET /api/operations/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const op = loadOperation(id);
    if (!op) {
      return NextResponse.json({ error: "Operation not found" }, { status: 404 });
    }
    return NextResponse.json({ data: { operation: op } });
  } catch (error) {
    logApiError("GET /api/operations/[id]", "read", error);
    return NextResponse.json({ error: "Failed to read operation" }, { status: 500 });
  }
}

// PUT /api/operations/[id] — { action: advance | back | pause | resume | delete }
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ro = requireNotReadOnly();
  if (ro) return ro;
  const auth = requireMcApiKey(request);
  if (auth) return auth;

  try {
    const { id } = await params;
    const op = loadOperation(id);
    if (!op) {
      return NextResponse.json({ error: "Operation not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action as string;
    const now = new Date().toISOString();

    if (action === "delete") {
      const safe = sanitizeOpId(op.id);
      const p = OPS_DIR + "/" + safe + ".json";
      if (existsSync(p)) unlinkSync(p);
      appendAuditLine({
        action: "operations.delete",
        resource: id,
        ok: true,
      });
      return NextResponse.json({ data: { deleted: true } });
    }

    if (action === "pause") {
      op.status = "paused";
      op.updatedAt = now;
      saveOperation(op);
      appendAuditLine({ action: "operations.pause", resource: id, ok: true });
      return NextResponse.json({ data: { operation: op } });
    }

    if (action === "resume") {
      op.status = op.steps.length === 0 ? "draft" : "active";
      op.updatedAt = now;
      saveOperation(op);
      appendAuditLine({ action: "operations.resume", resource: id, ok: true });
      return NextResponse.json({ data: { operation: op } });
    }

    if (action === "advance") {
      if (op.currentStepIndex < op.steps.length) {
        const step = op.steps[op.currentStepIndex];
        op.steps[op.currentStepIndex] = {
          ...step,
          status: "done",
          updatedAt: now,
        };
        op.currentStepIndex += 1;
      }
      if (op.currentStepIndex >= op.steps.length) {
        op.status = "completed";
      } else {
        op.status = "active";
      }
      op.updatedAt = now;
      saveOperation(op);
      appendAuditLine({
        action: "operations.advance",
        resource: id,
        ok: true,
      });
      return NextResponse.json({ data: { operation: op } });
    }

    if (action === "back") {
      if (op.currentStepIndex > 0) {
        op.currentStepIndex -= 1;
        const step = op.steps[op.currentStepIndex];
        op.steps[op.currentStepIndex] = {
          ...step,
          status: "pending",
          updatedAt: now,
        };
      }
      op.status = "active";
      op.updatedAt = now;
      saveOperation(op);
      appendAuditLine({ action: "operations.back", resource: id, ok: true });
      return NextResponse.json({ data: { operation: op } });
    }

    return NextResponse.json(
      { error: "Unknown action (advance, back, pause, resume, delete)" },
      { status: 400 }
    );
  } catch (error) {
    logApiError("PUT /api/operations/[id]", "update", error);
    return NextResponse.json(
      { error: "Failed to update operation" },
      { status: 500 }
    );
  }
}
