/** @jest-environment node */

const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();

jest.mock("fs", () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
}));

jest.mock("@/lib/hermes", () => ({
  HERMES_HOME: "/tmp/test-hermes",
}));

jest.mock("@/lib/api-logger", () => ({
  logApiError: jest.fn(),
}));

const mockRequireMcApiKey = jest.fn(() => null);
const mockRequireNotReadOnly = jest.fn(() => null);

jest.mock("@/lib/api-auth", () => ({
  requireMcApiKey: (...args: unknown[]) => mockRequireMcApiKey(...args),
  requireNotReadOnly: (...args: unknown[]) => mockRequireNotReadOnly(...args),
}));

const mockResolveSafeProfileName = jest.fn(
  (param: string | null) => {
    const profile = (param || "default").trim();
    if (profile === "default" || profile === "") return { ok: true, profile: "default" };
    if (/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(profile)) return { ok: true, profile };
    return { ok: false, error: "Invalid profile name" };
  }
);

jest.mock("@/lib/path-security", () => ({
  resolveSafeProfileName: (...args: unknown[]) => mockResolveSafeProfileName(...args),
}));

import { NextRequest, NextResponse } from "next/server";

describe("PUT /api/skills/[name]/toggle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: auth passes
    mockRequireMcApiKey.mockReturnValue(null);
    mockRequireNotReadOnly.mockReturnValue(null);
  });

  it("rejects request when requireNotReadOnly returns a response", async () => {
    const readOnlyResponse = NextResponse.json(
      { error: "Read-only mode" },
      { status: 403 }
    );
    mockRequireNotReadOnly.mockReturnValue(readOnlyResponse);

    const { PUT } = await import("@/app/api/skills/[name]/toggle/route");
    const req = new NextRequest("http://localhost/api/skills/test-skill/toggle", {
      method: "PUT",
      body: JSON.stringify({ enabled: true }),
      headers: { "content-type": "application/json" },
    });

    const res = await PUT(req, { params: Promise.resolve({ name: "test-skill" }) });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Read-only mode");
  });

  it("rejects request when requireMcApiKey returns a response", async () => {
    const authResponse = NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
    mockRequireMcApiKey.mockReturnValue(authResponse);

    const { PUT } = await import("@/app/api/skills/[name]/toggle/route");
    const req = new NextRequest("http://localhost/api/skills/test-skill/toggle", {
      method: "PUT",
      body: JSON.stringify({ enabled: true }),
      headers: { "content-type": "application/json" },
    });

    const res = await PUT(req, { params: Promise.resolve({ name: "test-skill" }) });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("rejects invalid profile names", async () => {
    const { PUT } = await import("@/app/api/skills/[name]/toggle/route");
    const req = new NextRequest("http://localhost/api/skills/test-skill/toggle", {
      method: "PUT",
      body: JSON.stringify({ enabled: true, profile: "../../../etc" }),
      headers: { "content-type": "application/json" },
    });

    const res = await PUT(req, { params: Promise.resolve({ name: "test-skill" }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid profile name");
  });

  it("succeeds with valid auth and profile", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      "skills:\n  disabled:\n    - some-skill\n"
    );

    const { PUT } = await import("@/app/api/skills/[name]/toggle/route");
    const req = new NextRequest("http://localhost/api/skills/test-skill/toggle", {
      method: "PUT",
      body: JSON.stringify({ enabled: false, profile: "default" }),
      headers: { "content-type": "application/json" },
    });

    const res = await PUT(req, { params: Promise.resolve({ name: "test-skill" }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.success).toBe(true);
    expect(data.data.skill).toBe("test-skill");
    expect(data.data.enabled).toBe(false);
    expect(mockWriteFileSync).toHaveBeenCalled();
  });
});
