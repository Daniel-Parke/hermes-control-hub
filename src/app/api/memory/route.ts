import { NextRequest, NextResponse } from "next/server";

import { getMemoryProviderType } from "@/lib/memory-providers";
import { logApiError } from "@/lib/api-logger";
import type { ApiResponse, MemoryData } from "@/types/hermes";

// GET — Read memory facts
// For Hindsight embedded: shows status only (facts managed via agent tools)
// For Holographic: reads SQLite directly
export async function GET() {
  const providerType = getMemoryProviderType();

  // Hindsight embedded — no direct DB access, facts managed by agent
  if (providerType === "hindsight") {
    return NextResponse.json<ApiResponse<MemoryData>>({
      data: {
        facts: [],
        total: 0,
        dbSize: 0,
        available: true,
        provider: "hindsight",
        message:
          "Hindsight memory is active. Facts are managed through agent tools: " +
          "hindsight_retain (store), hindsight_recall (search), hindsight_reflect (reason).",
      },
    });
  }

  // Holographic — read SQLite directly
  if (providerType === "holographic") {
    try {
      const { holographicProvider } = await import(
        "@/lib/memory-providers/holographic"
      );
      const result = await holographicProvider.readFacts();
      return NextResponse.json<ApiResponse<MemoryData>>({ data: result });
    } catch (error) {
      logApiError("GET /api/memory", "holographic read", error);
      return NextResponse.json<ApiResponse<MemoryData>>(
        { error: "Could not read holographic memory database" },
        { status: 500 }
      );
    }
  }

  // No provider configured
  return NextResponse.json<ApiResponse<MemoryData>>({
    data: {
      facts: [],
      total: 0,
      dbSize: 0,
      available: false,
      provider: "none",
      message: "No memory provider configured. Run: hermes memory setup",
    },
  });
}

// POST — Add a new memory fact (holographic only)
export async function POST(request: NextRequest) {
  const providerType = getMemoryProviderType();

  if (providerType === "hindsight") {
    return NextResponse.json(
      {
        error:
          "Hindsight facts are managed through agent tools (hindsight_retain). Dashboard editing is not supported for Hindsight.",
      },
      { status: 400 }
    );
  }

  if (providerType === "holographic") {
    try {
      const { holographicProvider } = await import(
        "@/lib/memory-providers/holographic"
      );
      const body = await request.json();
      const { content, category = "general", tags = "", trust_score = 0.7 } =
        body;

      if (
        !content ||
        typeof content !== "string" ||
        content.trim().length === 0
      ) {
        return NextResponse.json(
          { error: "Content is required" },
          { status: 400 }
        );
      }

      const result = await holographicProvider.addFact({
        content: content.trim(),
        category,
        tags,
        trust_score,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to add fact" },
          { status: 500 }
        );
      }

      return NextResponse.json({ data: { success: true, fact: result.fact } });
    } catch (error) {
      logApiError("POST /api/memory", "adding fact", error);
      return NextResponse.json(
        { error: "Failed to add fact" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "No memory provider configured" },
    { status: 404 }
  );
}

// PUT — Update an existing memory fact (holographic only)
export async function PUT(request: NextRequest) {
  const providerType = getMemoryProviderType();

  if (providerType === "hindsight") {
    return NextResponse.json(
      {
        error:
          "Hindsight facts cannot be edited through the dashboard. Use agent tools.",
      },
      { status: 400 }
    );
  }

  if (providerType === "holographic") {
    try {
      const { holographicProvider } = await import(
        "@/lib/memory-providers/holographic"
      );
      const body = await request.json();
      const { id, content, category, tags, trust_score } = body;

      if (!id || typeof id !== "number") {
        return NextResponse.json(
          { error: "Valid fact ID is required" },
          { status: 400 }
        );
      }

      const result = await holographicProvider.updateFact({
        id,
        content,
        category,
        tags,
        trust_score,
      });

      if (!result.success) {
        const status = result.error?.includes("not found") ? 404 : 500;
        return NextResponse.json({ error: result.error }, { status });
      }

      return NextResponse.json({ data: { success: true, id: result.id } });
    } catch (error) {
      logApiError("PUT /api/memory", "updating fact", error);
      return NextResponse.json({ error: "Failed to update fact" }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: "No memory provider configured" },
    { status: 404 }
  );
}

// DELETE — Remove a memory fact (holographic only)
export async function DELETE(request: NextRequest) {
  const providerType = getMemoryProviderType();

  if (providerType === "hindsight") {
    return NextResponse.json(
      {
        error:
          "Hindsight facts cannot be deleted through the dashboard. Use agent tools.",
      },
      { status: 400 }
    );
  }

  if (providerType === "holographic") {
    try {
      const { holographicProvider } = await import(
        "@/lib/memory-providers/holographic"
      );
      const { searchParams } = new URL(request.url);
      const id = parseInt(searchParams.get("id") || "", 10);

      if (isNaN(id)) {
        return NextResponse.json(
          { error: "Valid fact ID is required" },
          { status: 400 }
        );
      }

      const result = await holographicProvider.deleteFact(id);

      if (!result.success) {
        const status = result.error?.includes("not found")
          ? 404
          : result.error?.includes("busy")
            ? 503
            : 500;
        return NextResponse.json({ error: result.error }, { status });
      }

      return NextResponse.json({ data: { success: true, id: result.id } });
    } catch (error) {
      logApiError("DELETE /api/memory", "deleting fact", error);
      return NextResponse.json({ error: "Failed to delete fact" }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: "No memory provider configured" },
    { status: 404 }
  );
}
