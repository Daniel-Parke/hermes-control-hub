import { NextRequest, NextResponse } from "next/server";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

import { PATHS } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";
import { requireMcApiKey, requireNotReadOnly } from "@/lib/api-auth";
import { appendAuditLine } from "@/lib/audit-log";
import { resolveAllowedWorkspacePath } from "@/lib/path-security";
import type { WorkspaceEntry, WorkspaceRegistry } from "@/types/hermes";

const REGISTRY_PATH = PATHS.workspaces + "/registry.json";

function ensureDir() {
  if (!existsSync(PATHS.workspaces)) {
    mkdirSync(PATHS.workspaces, { recursive: true });
  }
}

function loadRegistry(): WorkspaceRegistry {
  if (!existsSync(REGISTRY_PATH)) {
    return { workspaces: [], updatedAt: new Date().toISOString() };
  }
  try {
    return JSON.parse(readFileSync(REGISTRY_PATH, "utf-8")) as WorkspaceRegistry;
  } catch {
    return { workspaces: [], updatedAt: new Date().toISOString() };
  }
}

function saveRegistry(reg: WorkspaceRegistry) {
  ensureDir();
  writeFileSync(REGISTRY_PATH, JSON.stringify(reg, null, 2));
}

// GET /api/workspaces
export async function GET() {
  try {
    const reg = loadRegistry();
    return NextResponse.json({ data: reg });
  } catch (error) {
    logApiError("GET /api/workspaces", "read", error);
    return NextResponse.json(
      { error: "Failed to read workspace registry" },
      { status: 500 }
    );
  }
}

// POST /api/workspaces — add entry
export async function POST(request: NextRequest) {
  const ro = requireNotReadOnly();
  if (ro) return ro;
  const auth = requireMcApiKey(request);
  if (auth) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    const label = typeof body.label === "string" ? body.label.trim() : "";
    const pathRaw = typeof body.path === "string" ? body.path.trim() : "";
    if (!label || !pathRaw) {
      return NextResponse.json(
        { error: "label and path are required" },
        { status: 400 }
      );
    }
    const resolved = resolveAllowedWorkspacePath(pathRaw);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }
    const now = new Date().toISOString();
    const id =
      "ws_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const entry: WorkspaceEntry = {
      id,
      label,
      path: resolved.absolute,
      gitRemote: typeof body.gitRemote === "string" ? body.gitRemote : undefined,
      createdAt: now,
      updatedAt: now,
    };
    const reg = loadRegistry();
    reg.workspaces = reg.workspaces.filter((w) => w.path !== entry.path);
    reg.workspaces.push(entry);
    reg.updatedAt = now;
    saveRegistry(reg);
    appendAuditLine({ action: "workspaces.add", resource: id, ok: true });
    return NextResponse.json({ data: { entry, registry: reg } });
  } catch (error) {
    logApiError("POST /api/workspaces", "add", error);
    return NextResponse.json(
      { error: "Failed to add workspace" },
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
    const reg = loadRegistry();
    const next = reg.workspaces.filter((w) => w.id !== id);
    if (next.length === reg.workspaces.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    reg.workspaces = next;
    reg.updatedAt = new Date().toISOString();
    saveRegistry(reg);
    appendAuditLine({ action: "workspaces.delete", resource: id, ok: true });
    return NextResponse.json({ data: { registry: reg } });
  } catch (error) {
    logApiError("DELETE /api/workspaces", "delete", error);
    return NextResponse.json(
      { error: "Failed to delete workspace" },
      { status: 500 }
    );
  }
}
