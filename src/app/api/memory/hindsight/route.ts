import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";

import { HERMES_HOME } from "@/lib/hermes";
import { logApiError } from "@/lib/api-logger";
import type { ApiResponse } from "@/types/hermes";

const BRIDGE_SCRIPT = HERMES_HOME + "/scripts/hindsight_bridge.py";
const PYTHON = HERMES_HOME + "/hermes-agent/venv/bin/python3";

function runBridge(command: string, args: Record<string, string | number | undefined> = {}): Record<string, unknown> {
  const argStr = Object.entries(args)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `--${k} ${JSON.stringify(String(v))}`)
    .join(" ");

  const cmd = `${PYTHON} ${BRIDGE_SCRIPT} ${command} ${argStr}`;
  try {
    const output = execSync(cmd, {
      timeout: 30000,
      encoding: "utf-8",
      env: {
        ...process.env,
        PYTHONPATH: HERMES_HOME + "/hermes-agent",
      },
    });
    return JSON.parse(output);
  } catch (error) {
    if (error instanceof Error && "stdout" in error) {
      try {
        return JSON.parse((error as { stdout: string }).stdout);
      } catch {}
    }
    throw error;
  }
}

// GET — List memories, recall, reflect, health check
export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action") || "list";
  const query = request.nextUrl.searchParams.get("query") || undefined;
  const budget = request.nextUrl.searchParams.get("budget") || undefined;
  const bank = request.nextUrl.searchParams.get("bank") || undefined;
  const limit = request.nextUrl.searchParams.get("limit") || undefined;

  try {
    let result: Record<string, unknown>;

    switch (action) {
      case "list":
        result = runBridge("list", { bank, search: query, limit });
        break;
      case "recall":
        if (!query) {
          return NextResponse.json({ error: "query is required for recall" }, { status: 400 });
        }
        result = runBridge("recall", { bank, query, budget });
        break;
      case "reflect":
        if (!query) {
          return NextResponse.json({ error: "query is required for reflect" }, { status: 400 });
        }
        result = runBridge("reflect", { bank, query, budget });
        break;
      case "directives":
        result = runBridge("directives", { bank });
        break;
      case "mental-models":
        result = runBridge("mental-models", { bank });
        break;
      case "health":
        result = runBridge("health");
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json<ApiResponse<Record<string, unknown>>>({ data: result });
  } catch (error) {
    logApiError("GET /api/memory/hindsight", `action=${action}`, error);
    return NextResponse.json(
      { error: `Hindsight bridge error: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

// POST — Retain a new memory
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, tags, bank = "hermes" } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const args: Record<string, string> = { bank, content: content.trim() };
    if (tags && Array.isArray(tags)) {
      args.tags = tags.join(",");
    }

    const result = runBridge("retain", args);

    return NextResponse.json<ApiResponse<Record<string, unknown>>>({ data: result });
  } catch (error) {
    logApiError("POST /api/memory/hindsight", "retain", error);
    return NextResponse.json(
      { error: `Failed to retain memory: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
