/** @jest-environment node */

// Regression: PUT /api/tools must require auth (api key + not read-only)
// Bug: tools PUT handler was missing requireMcApiKey and requireNotReadOnly checks.

const mockRequireMcApiKey = jest.fn();
const mockRequireNotReadOnly = jest.fn();
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockExistsSync = jest.fn();

jest.mock("fs", () => ({
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  existsSync: mockExistsSync,
}));

jest.mock("@/lib/hermes", () => ({
  HERMES_HOME: "/tmp/test-hermes",
  PATHS: { config: "/tmp/test-hermes/config.yaml" },
}));

jest.mock("@/lib/api-logger", () => ({
  logApiError: jest.fn(),
}));

jest.mock("@/lib/api-auth", () => ({
  requireMcApiKey: mockRequireMcApiKey,
  requireNotReadOnly: mockRequireNotReadOnly,
}));

import { NextRequest } from "next/server";

describe("PUT /api/tools auth regression", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
  });

  it("rejects when read-only mode is active", async () => {
    const { PUT } = await import("@/app/api/tools/route");
    const readOnlyResponse = new Response("Read only", { status: 403 });
    mockRequireNotReadOnly.mockReturnValue(readOnlyResponse);

    const req = new NextRequest("http://localhost/api/tools", {
      method: "PUT",
      body: JSON.stringify({ platform: "discord", toolsets: ["terminal"] }),
    });
    const res = await PUT(req);

    expect(res.status).toBe(403);
    expect(mockRequireNotReadOnly).toHaveBeenCalled();
  });

  it("rejects when API key is missing/invalid", async () => {
    const { PUT } = await import("@/app/api/tools/route");
    mockRequireNotReadOnly.mockReturnValue(null);
    const authResponse = new Response("Unauthorized", { status: 401 });
    mockRequireMcApiKey.mockReturnValue(authResponse);

    const req = new NextRequest("http://localhost/api/tools", {
      method: "PUT",
      body: JSON.stringify({ platform: "discord", toolsets: ["terminal"] }),
    });
    const res = await PUT(req);

    expect(res.status).toBe(401);
    expect(mockRequireMcApiKey).toHaveBeenCalled();
  });

  it("proceeds when auth passes", async () => {
    const { PUT } = await import("@/app/api/tools/route");
    mockRequireNotReadOnly.mockReturnValue(null);
    mockRequireMcApiKey.mockReturnValue(null);
    mockReadFileSync.mockReturnValue("platform_toolsets:\n  discord:\n    - browser\n");

    const req = new NextRequest("http://localhost/api/tools", {
      method: "PUT",
      body: JSON.stringify({ platform: "discord", toolsets: ["terminal", "file"] }),
    });
    const res = await PUT(req);

    // Should proceed past auth checks (not 401/403)
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
