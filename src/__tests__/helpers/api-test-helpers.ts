// ═══════════════════════════════════════════════════════════════
// API Test Helpers — shared utilities for route tests
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from "next/server";

/** Create a mock NextRequest for testing API routes. */
export function mockRequest(
  url: string,
  method: string = "GET",
  body?: unknown,
  searchParams?: Record<string, string>
): NextRequest {
  let fullUrl = url;
  if (searchParams && Object.keys(searchParams).length > 0) {
    const params = new URLSearchParams(searchParams);
    fullUrl += "?" + params.toString();
  }
  return new NextRequest(fullUrl, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "content-type": "application/json" } : undefined,
  });
}

/** Assert a JSON response has the expected status and shape. */
export async function expectJsonResponse(
  response: Response,
  expectedStatus: number = 200
): Promise<Record<string, unknown>> {
  expect(response.status).toBe(expectedStatus);
  return await response.json();
}

/** Common mock setup for fs operations. Returns the mock functions. */
export function setupFsMocks() {
  const mocks = {
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    readdirSync: jest.fn(),
    statSync: jest.fn(),
    mkdirSync: jest.fn(),
    rmSync: jest.fn(),
  };
  return mocks;
}

/** Setup standard mocks for routes that use hermes paths + api-auth. */
export function setupRouteMocks() {
  jest.mock("@/lib/hermes", () => ({
    HERMES_HOME: "/tmp/test-hermes",
    PATHS: {
      config: "/tmp/test-hermes/config.yaml",
      env: "/tmp/test-hermes/.env",
      soul: "/tmp/test-hermes/SOUL.md",
      cronJobs: "/tmp/test-hermes/cron/jobs.json",
      sessions: "/tmp/test-hermes/sessions",
      skills: "/tmp/test-hermes/skills",
      memoryDb: "/tmp/test-hermes/memory_store.db",
      backups: "/tmp/test-hermes/backups",
      logs: "/tmp/test-hermes/logs",
      missions: "/tmp/test-hermes/control-hub/data/missions",
      templates: "/tmp/test-hermes/control-hub/data/templates",
    },
    getDefaultModelConfig: () => ({
      provider: "nous",
      model: "xiaomi/mimo-v2-pro",
    }),
  }));

  jest.mock("@/lib/api-logger", () => ({
    logApiError: jest.fn(),
    safeJsonParse: jest.fn(() => ({})),
    safeReadJsonFile: jest.fn(() => ({ ok: true, data: {} })),
  }));

  jest.mock("@/lib/api-auth", () => ({
    requireMcApiKey: jest.fn(() => null),
    requireChApiKey: jest.fn(() => null),
    requireNotReadOnly: jest.fn(() => null),
    requireSignedRequest: jest.fn(() => null),
  }));

  jest.mock("@/lib/audit-log", () => ({
    appendAuditLine: jest.fn(),
  }));
}
