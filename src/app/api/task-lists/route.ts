import { NextRequest, NextResponse } from "next/server";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "fs";

import { PATHS } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";
import { requireMcApiKey, requireNotReadOnly } from "@/lib/api-auth";
import { appendAuditLine } from "@/lib/audit-log";
import type { TaskListRecord, TaskListStep } from "@/types/hermes";

const DIR = PATHS.taskLists;

function ensureDir() {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}

function loadOne(id: string): TaskListRecord | null {
  const safe = sanitizeId(id);
  if (!safe) return null;
  const p = DIR + "/" + safe + ".json";
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as TaskListRecord;
  } catch {
    return null;
  }
}

function save(rec: TaskListRecord) {
  ensureDir();
  const safe = sanitizeId(rec.id);
  if (!safe) return;
  writeFileSync(DIR + "/" + safe + ".json", JSON.stringify(rec, null, 2));
}

// GET /api/task-lists — list or ?id=
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      const rec = loadOne(id);
      if (!rec) {
        return NextResponse.json({ error: "Task list not found" }, { status: 404 });
      }
      return NextResponse.json({ data: { taskList: rec } });
    }
    ensureDir();
    const files = existsSync(DIR)
      ? readdirSync(DIR).filter((f) => f.endsWith(".json"))
      : [];
    const taskLists: TaskListRecord[] = [];
    for (const f of files) {
      try {
        taskLists.push(
          JSON.parse(readFileSync(DIR + "/" + f, "utf-8")) as TaskListRecord
        );
      } catch {
        // skip
      }
    }
    taskLists.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return NextResponse.json({
      data: { taskLists, total: taskLists.length },
    });
  } catch (error) {
    logApiError("GET /api/task-lists", "list", error);
    return NextResponse.json(
      { error: "Failed to list task lists" },
      { status: 500 }
    );
  }
}

// POST /api/task-lists — create
export async function POST(request: NextRequest) {
  const ro = requireNotReadOnly();
  if (ro) return ro;
  const auth = requireMcApiKey(request);
  if (auth) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const rawSteps = Array.isArray(body.steps) ? body.steps : [];
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const id =
      "tl_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    const steps: TaskListStep[] = rawSteps.map(
      (s: Record<string, unknown>, i: number) => {
        const title =
          typeof s.title === "string" && s.title.trim()
            ? s.title.trim()
            : "Step " + (i + 1);
        const schedule =
          typeof s.schedule === "string" && s.schedule.trim()
            ? s.schedule.trim()
            : "every 1h";
        return {
          id: "tls_" + i + "_" + Date.now().toString(36),
          title,
          schedule,
          missionTemplateId:
            typeof s.missionTemplateId === "string"
              ? s.missionTemplateId
              : undefined,
          prompt: typeof s.prompt === "string" ? s.prompt : undefined,
          profile: typeof s.profile === "string" ? s.profile : undefined,
          model: typeof s.model === "string" ? s.model : undefined,
        };
      }
    );

    const rec: TaskListRecord = {
      id,
      name,
      description,
      steps,
      coordinatorJobId: null,
      coordinatorNotes:
        "Optional: single Hermes cron job whose prompt advances this list; state file can live alongside this JSON.",
      createdAt: now,
      updatedAt: now,
    };

    save(rec);
    appendAuditLine({ action: "task_lists.create", resource: id, ok: true });
    return NextResponse.json({ data: { taskList: rec } });
  } catch (error) {
    logApiError("POST /api/task-lists", "create", error);
    return NextResponse.json(
      { error: "Failed to create task list" },
      { status: 500 }
    );
  }
}

// PUT /api/task-lists — update full record (body includes id)
export async function PUT(request: NextRequest) {
  const ro = requireNotReadOnly();
  if (ro) return ro;
  const auth = requireMcApiKey(request);
  if (auth) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === "string" ? body.id : "";
    const existing = loadOne(id);
    if (!existing) {
      return NextResponse.json({ error: "Task list not found" }, { status: 404 });
    }
    const now = new Date().toISOString();
    const next: TaskListRecord = {
      ...existing,
      name: typeof body.name === "string" ? body.name.trim() : existing.name,
      description:
        typeof body.description === "string"
          ? body.description
          : existing.description,
      steps: Array.isArray(body.steps) ? body.steps : existing.steps,
      coordinatorJobId:
        body.coordinatorJobId !== undefined
          ? body.coordinatorJobId === null
            ? null
            : String(body.coordinatorJobId)
          : existing.coordinatorJobId,
      coordinatorNotes:
        typeof body.coordinatorNotes === "string"
          ? body.coordinatorNotes
          : existing.coordinatorNotes,
      updatedAt: now,
    };
    save(next);
    appendAuditLine({ action: "task_lists.put", resource: id, ok: true });
    return NextResponse.json({ data: { taskList: next } });
  } catch (error) {
    logApiError("PUT /api/task-lists", "update", error);
    return NextResponse.json(
      { error: "Failed to update task list" },
      { status: 500 }
    );
  }
}

// DELETE ?id=
export async function DELETE(request: NextRequest) {
  const ro = requireNotReadOnly();
  if (ro) return ro;
  const auth = requireMcApiKey(request);
  if (auth) return auth;

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const safe = sanitizeId(id);
    const p = DIR + "/" + safe + ".json";
    if (!existsSync(p)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    unlinkSync(p);
    appendAuditLine({ action: "task_lists.delete", resource: id, ok: true });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    logApiError("DELETE /api/task-lists", "delete", error);
    return NextResponse.json(
      { error: "Failed to delete task list" },
      { status: 500 }
    );
  }
}
