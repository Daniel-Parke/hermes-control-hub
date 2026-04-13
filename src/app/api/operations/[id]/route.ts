import { NextRequest, NextResponse } from "next/server";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "fs";

import { PATHS } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";
import { requireMcApiKey, requireNotReadOnly } from "@/lib/api-auth";
import { appendAuditLine } from "@/lib/audit-log";
import { TEMPLATES, promptFromTemplate } from "@/lib/mission-helpers";
import { saveMission } from "@/lib/missions-repository";
import type { Mission, OperationRecord } from "@/types/hermes";

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

// POST /api/operations/[id] — { action: "dispatchCurrentStep" } creates a saved mission from the current step template
export async function POST(
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
    if (action !== "dispatchCurrentStep") {
      return NextResponse.json(
        { error: "Unknown action (dispatchCurrentStep)" },
        { status: 400 }
      );
    }

    if (op.currentStepIndex >= op.steps.length) {
      return NextResponse.json(
        { error: "No current step to dispatch" },
        { status: 400 }
      );
    }

    const step = op.steps[op.currentStepIndex];
    const tid = step.missionTemplateId?.trim();
    if (!tid) {
      return NextResponse.json(
        { error: "Current step has no missionTemplateId" },
        { status: 400 }
      );
    }

    const tmpl = TEMPLATES.find((t) => t.id === tid);
    if (!tmpl) {
      return NextResponse.json(
        { error: `Unknown template: ${tid}` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const mid =
      "m_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    const mission: Mission = {
      id: mid,
      name: `${tmpl.name} — ${op.name}`,
      prompt: promptFromTemplate(tmpl),
      goals: tmpl.goals,
      skills: tmpl.suggestedSkills,
      model: step.model ?? "",
      profile: step.profile ?? tmpl.profile,
      missionTimeMinutes: 30,
      timeoutMinutes: 15,
      schedule: "every 5m",
      templateId: tmpl.id,
      status: "queued",
      dispatchMode: "save",
      createdAt: now,
      updatedAt: now,
      results: null,
      duration: null,
      error: null,
    };

    saveMission(mission);

    op.steps[op.currentStepIndex] = {
      ...step,
      missionId: mid,
      status: "running",
      updatedAt: now,
    };
    op.runnerContract = "dispatch_mission_per_step";
    op.status = "active";
    op.updatedAt = now;
    saveOperation(op);

    appendAuditLine({
      action: "operations.dispatch_step",
      resource: id,
      ok: true,
      detail: mid,
    });

    return NextResponse.json({
      data: { operation: op, missionId: mid },
    });
  } catch (error) {
    logApiError("POST /api/operations/[id]", "dispatch", error);
    return NextResponse.json(
      { error: "Failed to dispatch step" },
      { status: 500 }
    );
  }
}
