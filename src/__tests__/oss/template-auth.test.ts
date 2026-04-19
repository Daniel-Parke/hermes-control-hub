/**
 * @jest-environment node
 */

/** Verify that the templates POST endpoint requires authentication. */

const mockRequireMcApiKey = jest.fn();
const mockRequireNotReadOnly = jest.fn();

jest.mock("@/lib/hermes", () => ({
  HERMES_HOME: "/tmp/test-hermes",
  PATHS: { templates: "/tmp/test-hermes/templates" },
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

jest.mock("fs", () => ({
  existsSync: jest.fn(() => false),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  readdirSync: jest.fn(() => []),
  unlinkSync: jest.fn(),
}));

jest.mock("@agent-control-hub/schema", () => ({
  parseTemplatePackManifestV1: jest.fn(),
}));

import { NextRequest, NextResponse } from "next/server";

describe("POST /api/templates auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no auth required (returns null = allowed)
    mockRequireNotReadOnly.mockReturnValue(null);
    mockRequireMcApiKey.mockReturnValue(null);
  });

  it("rejects read-only mode", async () => {
    const readOnlyResponse = NextResponse.json(
      { error: "Read-only mode" },
      { status: 403 }
    );
    mockRequireNotReadOnly.mockReturnValue(readOnlyResponse);

    const { POST } = await import("@/app/api/templates/route");
    const request = new NextRequest("http://localhost/api/templates", {
      method: "POST",
      body: JSON.stringify({ action: "create", name: "test" }),
    });
    const res = await POST(request);

    expect(res.status).toBe(403);
    expect(mockRequireNotReadOnly).toHaveBeenCalled();
  });

  it("rejects requests without valid API key", async () => {
    const authResponse = NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
    mockRequireMcApiKey.mockReturnValue(authResponse);

    const { POST } = await import("@/app/api/templates/route");
    const request = new NextRequest("http://localhost/api/templates", {
      method: "POST",
      body: JSON.stringify({ action: "create", name: "test" }),
    });
    const res = await POST(request);

    expect(res.status).toBe(401);
    expect(mockRequireMcApiKey).toHaveBeenCalled();
  });

  it("allows requests with valid auth", async () => {
    // Both checks pass (return null)
    mockRequireNotReadOnly.mockReturnValue(null);
    mockRequireMcApiKey.mockReturnValue(null);

    const { POST } = await import("@/app/api/templates/route");
    const request = new NextRequest("http://localhost/api/templates", {
      method: "POST",
      body: JSON.stringify({ action: "create", name: "Test Template" }),
    });
    const res = await POST(request);

    // Should proceed to create (not blocked by auth)
    expect(mockRequireNotReadOnly).toHaveBeenCalled();
    expect(mockRequireMcApiKey).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });
});
