/** @jest-environment node */

// Regression: Config PUT must reject non-object `values`
// Bug: passing values as string/array caused deepMerge to crash with Object.keys()

const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockExistsSync = jest.fn();
const mockMkdirSync = jest.fn();
const mockRequireMcApiKey = jest.fn();
const mockRequireNotReadOnly = jest.fn();

jest.mock("fs", () => ({
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
}));

jest.mock("@/lib/hermes", () => ({
  HERMES_HOME: "/tmp/test-hermes",
  PATHS: { config: "/tmp/test-hermes/config.yaml", backups: "/tmp/test-hermes/backups" },
}));

jest.mock("@/lib/api-logger", () => ({
  logApiError: jest.fn(),
}));

jest.mock("@/lib/api-auth", () => ({
  requireMcApiKey: mockRequireMcApiKey,
  requireNotReadOnly: mockRequireNotReadOnly,
}));

jest.mock("@/lib/audit-log", () => ({
  appendAuditLine: jest.fn(),
}));

import { NextRequest } from "next/server";

describe("PUT /api/config values validation regression", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadFileSync.mockReturnValue("agent:\n  personality: technical\n");
    mockExistsSync.mockReturnValue(true);
    mockRequireMcApiKey.mockReturnValue(null);
    mockRequireNotReadOnly.mockReturnValue(null);
  });

  it("rejects when values is a string", async () => {
    const { PUT } = await import("@/app/api/config/route");
    const req = new NextRequest("http://localhost/api/config", {
      method: "PUT",
      body: JSON.stringify({ section: "agent", values: "invalid" }),
    });
    const res = await PUT(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/values must be an object/i);
  });

  it("rejects when values is an array", async () => {
    const { PUT } = await import("@/app/api/config/route");
    const req = new NextRequest("http://localhost/api/config", {
      method: "PUT",
      body: JSON.stringify({ section: "agent", values: ["a", "b"] }),
    });
    const res = await PUT(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/values must be an object/i);
  });

  it("rejects when values is null", async () => {
    const { PUT } = await import("@/app/api/config/route");
    const req = new NextRequest("http://localhost/api/config", {
      method: "PUT",
      body: JSON.stringify({ section: "agent", values: null }),
    });
    const res = await PUT(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/values/i);
  });

  it("accepts when values is a valid object", async () => {
    const { PUT } = await import("@/app/api/config/route");
    const req = new NextRequest("http://localhost/api/config", {
      method: "PUT",
      body: JSON.stringify({ section: "agent", values: { personality: "creative" } }),
    });
    const res = await PUT(req);

    // Should not return 400
    expect(res.status).not.toBe(400);
  });
});
