import { NextRequest, NextResponse } from "next/server";
import { existsSync, rmSync } from "fs";

import { HERMES_HOME } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";
import { resolveSafeProfileName } from "@/lib/path-security";
import { requireMcApiKey, requireNotReadOnly } from "@/lib/api-auth";
import { appendAuditLine } from "@/lib/audit-log";
import type { ApiResponse } from "@/types/hermes";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ro = requireNotReadOnly();
  if (ro) return ro;
  const auth = requireMcApiKey(request);
  if (auth) return auth;

  const { id } = await params;
  const prof = resolveSafeProfileName(id);
  if (!prof.ok) {
    return NextResponse.json({ error: prof.error }, { status: 400 });
  }

  // Cannot rename default profile
  if (prof.profile === "default") {
    return NextResponse.json(
      { error: "Cannot modify the default profile" },
      { status: 400 }
    );
  }

  const profileDir = HERMES_HOME + "/profiles/" + prof.profile;
  if (!existsSync(profileDir)) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { name, description: _description } = body as {
      name?: string;
      description?: string;
    };

    // Currently only support renaming via name field
    // Description could be stored in a metadata file in the future
    if (name && typeof name === "string" && name.trim().length >= 2) {
      const newSlug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      if (newSlug && newSlug !== prof.profile) {
        const newProf = resolveSafeProfileName(newSlug);
        if (!newProf.ok) {
          return NextResponse.json({ error: newProf.error }, { status: 400 });
        }

        const newDir = HERMES_HOME + "/profiles/" + newSlug;
        if (existsSync(newDir)) {
          return NextResponse.json(
            { error: `Profile "${newSlug}" already exists` },
            { status: 409 }
          );
        }

        // Rename directory
        const { renameSync } = await import("fs");
        renameSync(profileDir, newDir);
      }
    }

    appendAuditLine({
      action: "agent.profile.update",
      resource: prof.profile,
      ok: true,
    });

    return NextResponse.json<ApiResponse<{ success: true }>>({
      data: { success: true },
    });
  } catch (error) {
    logApiError("PUT /api/agent/profiles/[id]", `updating ${id}`, error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ro = requireNotReadOnly();
  if (ro) return ro;
  const auth = requireMcApiKey(request);
  if (auth) return auth;

  const { id } = await params;
  const prof = resolveSafeProfileName(id);
  if (!prof.ok) {
    return NextResponse.json({ error: prof.error }, { status: 400 });
  }

  // Cannot delete default profile
  if (prof.profile === "default") {
    return NextResponse.json(
      { error: "Cannot delete the default profile" },
      { status: 400 }
    );
  }

  const profileDir = HERMES_HOME + "/profiles/" + prof.profile;
  if (!existsSync(profileDir)) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  try {
    rmSync(profileDir, { recursive: true, force: true });

    appendAuditLine({
      action: "agent.profile.delete",
      resource: prof.profile,
      ok: true,
    });

    return NextResponse.json<ApiResponse<{ success: true }>>({
      data: { success: true },
    });
  } catch (error) {
    logApiError("DELETE /api/agent/profiles/[id]", `deleting ${id}`, error);
    return NextResponse.json(
      { error: "Failed to delete profile" },
      { status: 500 }
    );
  }
}
