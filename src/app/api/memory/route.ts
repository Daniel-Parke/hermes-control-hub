import { NextRequest, NextResponse } from "next/server";

import { getMemoryProvider, getMemoryProviderType } from "@/lib/memory-providers";
import { logApiError } from "@/lib/api-logger";
import type { ApiResponse, MemoryData } from "@/types/hermes";

// GET — Read memory facts
export async function GET(request: NextRequest) {
  const provider = getMemoryProvider();
  const providerType = getMemoryProviderType();

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;

    const result = await provider.readFacts({ search, category });

    return NextResponse.json<ApiResponse<MemoryData>>({
      data: {
        facts: result.facts,
        total: result.total,
        dbSize: result.dbSize,
        available: result.available,
        provider: result.provider,
        message: result.message,
        entities: result.entities,
        banks: result.banks,
      },
    });
  } catch (error) {
    logApiError("GET /api/memory", "reading memory (" + providerType + ")", error);
    return NextResponse.json<ApiResponse<MemoryData>>(
      {
        error: `Could not read memory: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}

// POST — Add a new memory fact
export async function POST(request: NextRequest) {
  const provider = getMemoryProvider();
  const providerType = getMemoryProviderType();

  if (providerType === "none") {
    return NextResponse.json(
      { error: "No memory provider configured. Run hermes memory setup." },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const { content, category = "general", tags = "", trust_score = 0.7 } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Whitelist fields only
    const result = await provider.addFact({
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
      {
        error: `Failed to add fact: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}

// PUT — Update an existing memory fact
export async function PUT(request: NextRequest) {
  const provider = getMemoryProvider();
  const providerType = getMemoryProviderType();

  if (providerType === "none") {
    return NextResponse.json(
      { error: "No memory provider configured" },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const { id, content, category, tags, trust_score } = body;

    if (!id || typeof id !== "number") {
      return NextResponse.json({ error: "Valid fact ID is required" }, { status: 400 });
    }

    // Whitelist fields only
    const result = await provider.updateFact({
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
    return NextResponse.json(
      {
        error: `Failed to update fact: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}

// DELETE — Remove a memory fact
export async function DELETE(request: NextRequest) {
  const provider = getMemoryProvider();
  const providerType = getMemoryProviderType();

  if (providerType === "none") {
    return NextResponse.json(
      { error: "No memory provider configured" },
      { status: 404 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "", 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Valid fact ID is required" }, { status: 400 });
    }

    const result = await provider.deleteFact(id);

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
    return NextResponse.json(
      {
        error: `Failed to delete fact: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
