import { NextRequest, NextResponse } from "next/server";
import { existsSync, statSync } from "fs";

// Use string concatenation to avoid Turbopack NFT tracing issues
import { HERMES_HOME, PATHS } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";

export async function GET() {
  const dbPath = PATHS.memoryDb;

  if (!existsSync(dbPath)) {
    return NextResponse.json({
      data: {
        facts: [],
        total: 0,
        dbSize: 0,
        entities: 0,
        banks: [],
        available: false,
        message: "Holographic memory is not installed. Install the hermes-memory-store plugin to enable persistent memory.",
      },
    });
  }

  try {
    const stats = statSync(dbPath);

    // Query SQLite directly for facts
    const Database = (await import("better-sqlite3")).default;
    const db = new Database(dbPath, { readonly: true });

    try {
      // Get fact count
      const countRow = db
        .prepare("SELECT COUNT(*) as count FROM facts")
        .get() as { count: number };

      // Get all facts (limited to 200)
      const facts = db
        .prepare(
          `SELECT fact_id, content, category, tags, trust_score, created_at, updated_at
           FROM facts
           ORDER BY updated_at DESC, created_at DESC
           LIMIT 200`
        )
        .all() as Array<{
        fact_id: number;
        content: string;
        category: string;
        tags: string;
        trust_score: number;
        created_at: string;
        updated_at: string;
      }>;

      // Get entity count
      const entityCount = (
        db.prepare("SELECT COUNT(*) as count FROM entities").get() as {
          count: number;
        }
      ).count;

      // Get memory banks
      const bankRows = db
        .prepare("SELECT bank_name, fact_count, updated_at FROM memory_banks ORDER BY fact_count DESC")
        .all() as Array<{
        bank_name: string;
        fact_count: number;
        updated_at: string;
      }>;

      return NextResponse.json({
        data: {
          facts: facts.map((f) => ({
            id: f.fact_id,
            content: f.content,
            category: f.category || "general",
            tags: f.tags || "",
            trust: f.trust_score ?? 0.5,
            createdAt: f.created_at,
            updatedAt: f.updated_at,
          })),
          total: countRow.count,
          dbSize: stats.size,
          dbPath: "memory_store.db",
          entities: entityCount,
          banks: bankRows,
        },
      });
    } finally {
      db.close();
    }
  } catch (error) {
    logApiError("GET /api/memory", "reading memory database", error);
    return NextResponse.json(
      { error: `Could not read memory database: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

// POST — Add a new memory fact
export async function POST(request: NextRequest) {
  const dbPath = PATHS.memoryDb;

  if (!existsSync(dbPath)) {
    return NextResponse.json({ error: "Holographic memory is not installed" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { content, category = "general", tags = "", trust_score = 0.7 } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const Database = (await import("better-sqlite3")).default;
    const db = new Database(dbPath);

    try {
      const now = new Date().toISOString();
      const result = db.prepare(
        `INSERT INTO facts (content, category, tags, trust_score, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(content.trim(), category, tags, trust_score, now, now);

      return NextResponse.json({
        data: {
          success: true,
          fact: {
            id: result.lastInsertRowid,
            content: content.trim(),
            category,
            tags,
            trust: trust_score,
            createdAt: now,
            updatedAt: now,
          },
        },
      });
    } finally {
      db.close();
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to add fact: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

// PUT — Update an existing memory fact
export async function PUT(request: NextRequest) {
  const dbPath = PATHS.memoryDb;

  if (!existsSync(dbPath)) {
    return NextResponse.json({ error: "Holographic memory is not installed" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { id, content, category, tags, trust_score } = body;

    if (!id || typeof id !== "number") {
      return NextResponse.json({ error: "Valid fact ID is required" }, { status: 400 });
    }

    const Database = (await import("better-sqlite3")).default;
    const db = new Database(dbPath);

    try {
      // Check fact exists
      const existing = db.prepare("SELECT fact_id FROM facts WHERE fact_id = ?").get(id);
      if (!existing) {
        return NextResponse.json({ error: "Fact not found" }, { status: 404 });
      }

      // Build dynamic update
      const updates: string[] = [];
      const values: unknown[] = [];

      if (content !== undefined && typeof content === "string") {
        updates.push("content = ?");
        values.push(content.trim());
      }
      if (category !== undefined && typeof category === "string") {
        updates.push("category = ?");
        values.push(category);
      }
      if (tags !== undefined && typeof tags === "string") {
        updates.push("tags = ?");
        values.push(tags);
      }
      if (trust_score !== undefined && typeof trust_score === "number") {
        updates.push("trust_score = ?");
        values.push(trust_score);
      }

      if (updates.length === 0) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
      }

      updates.push("updated_at = ?");
      values.push(new Date().toISOString());
      values.push(id);

      db.prepare(`UPDATE facts SET ${updates.join(", ")} WHERE fact_id = ?`).run(...values);

      return NextResponse.json({ data: { success: true, id } });
    } finally {
      db.close();
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to update fact: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

// DELETE — Remove a memory fact
export async function DELETE(request: NextRequest) {
  const dbPath = PATHS.memoryDb;

  if (!existsSync(dbPath)) {
    return NextResponse.json({ error: "Holographic memory is not installed" }, { status: 404 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "", 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Valid fact ID is required" }, { status: 400 });
    }

    const Database = (await import("better-sqlite3")).default;
    const db = new Database(dbPath);

    try {
      // Cascade: delete from fact_entities first (foreign key constraint)
      db.prepare("DELETE FROM fact_entities WHERE fact_id = ?").run(id);
      // Delete from FTS index
      try { db.prepare("DELETE FROM facts_fts WHERE rowid = ?").run(id); } catch (error) { logApiError("DELETE /api/memory", "deleting from FTS index", error); }
      // Delete the fact
      const result = db.prepare("DELETE FROM facts WHERE fact_id = ?").run(id);

      if (result.changes === 0) {
        return NextResponse.json({ error: "Fact not found" }, { status: 404 });
      }

      return NextResponse.json({ data: { success: true, id } });
    } finally {
      db.close();
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to delete fact: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
