/** @jest-environment node */

// Mock filesystem before importing the route
const mockExistsSync = jest.fn();
const mockMkdirSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockStatSync = jest.fn();
const mockReaddirSync = jest.fn();
const mockRmSync = jest.fn();

jest.mock("fs", () => ({
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  writeFileSync: mockWriteFileSync,
  readFileSync: mockReadFileSync,
  statSync: mockStatSync,
  readdirSync: mockReaddirSync,
  rmSync: mockRmSync,
  renameSync: jest.fn(),
}));

jest.mock("@/lib/hermes", () => ({
  HERMES_HOME: "/tmp/test-hermes",
  PATHS: {},
}));

jest.mock("@/lib/api-logger", () => ({
  logApiError: jest.fn(),
}));

jest.mock("@/lib/path-security", () => ({
  resolveSafeProfileName: (p: string | null) => {
    const profile = (p || "default").trim();
    if (profile === "default" || profile === "") return { ok: true, profile: "default" };
    if (/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(profile)) return { ok: true, profile };
    return { ok: false, error: "Invalid profile name" };
  },
}));

jest.mock("@/lib/api-auth", () => ({
  requireMcApiKey: jest.fn(() => null),
  requireNotReadOnly: jest.fn(() => null),
}));

jest.mock("@/lib/audit-log", () => ({
  appendAuditLine: jest.fn(),
}));

import { NextRequest } from "next/server";

function makeRequest(url: string, method: string = "GET", body?: unknown) {
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "content-type": "application/json" } : undefined,
  });
}

describe("GET /api/agent/profiles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
  });

  it("returns the default profile even without profiles directory", async () => {
    // config.yaml doesn't exist
    mockExistsSync.mockImplementation((p: string) => {
      if (p.includes("config.yaml")) return false;
      return false;
    });
    mockReaddirSync.mockReturnValue([]);

    const { GET } = await import("@/app/api/agent/profiles/route");
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.profiles).toHaveLength(1);
    expect(data.data.profiles[0].id).toBe("default");
    expect(data.data.profiles[0].name).toBe("Bob");
    expect(data.data.profiles[0].isDefault).toBe(true);
    expect(data.data.profiles[0].isBundled).toBe(false);
  });

  it("includes named profiles from the profiles directory", async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p.includes("config.yaml")) return false;
      if (p === "/tmp/test-hermes/profiles") return true;
      if (p.includes("qa-engineer")) return true;
      return false;
    });
    mockReaddirSync.mockReturnValue(["qa-engineer"]);
    mockStatSync.mockReturnValue({ isDirectory: () => true });
    mockReadFileSync.mockReturnValue("agent:\n  personality: technical\n");

    const { GET } = await import("@/app/api/agent/profiles/route");
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.profiles).toHaveLength(2);
    const qaProfile = data.data.profiles.find((p: { id: string }) => p.id === "qa-engineer");
    expect(qaProfile).toBeDefined();
    expect(qaProfile.name).toBe("Qa Engineer");
    expect(qaProfile.isDefault).toBe(false);
  });

  it("marks bundled profiles with isBundled: true", async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p.includes("config.yaml")) return false;
      if (p === "/tmp/test-hermes/profiles") return true;
      if (p.includes("qa-engineer") || p.includes("devops-engineer")) return true;
      return false;
    });
    mockReaddirSync.mockReturnValue(["qa-engineer", "devops-engineer", "custom-agent"]);
    mockStatSync.mockReturnValue({ isDirectory: () => true });
    mockReadFileSync.mockReturnValue("");

    const { GET } = await import("@/app/api/agent/profiles/route");
    const res = await GET();
    const data = await res.json();

    const qa = data.data.profiles.find((p: { id: string }) => p.id === "qa-engineer");
    const devops = data.data.profiles.find((p: { id: string }) => p.id === "devops-engineer");
    const custom = data.data.profiles.find((p: { id: string }) => p.id === "custom-agent");

    expect(qa.isBundled).toBe(true);
    expect(devops.isBundled).toBe(true);
    expect(custom.isBundled).toBe(false);
  });

  it("formats profile names without prefix stripping", async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p.includes("config.yaml")) return false;
      if (p === "/tmp/test-hermes/profiles") return true;
      return false;
    });
    mockReaddirSync.mockReturnValue(["swe-engineer"]);
    mockStatSync.mockReturnValue({ isDirectory: () => true });
    mockReadFileSync.mockReturnValue("");

    const { GET } = await import("@/app/api/agent/profiles/route");
    const res = await GET();
    const data = await res.json();

    const swe = data.data.profiles.find((p: { id: string }) => p.id === "swe-engineer");
    expect(swe.name).toBe("Swe Engineer");
  });
});

describe("POST /api/agent/profiles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue("");
  });

  it("rejects missing name", async () => {
    const { POST } = await import("@/app/api/agent/profiles/route");
    const res = await POST(makeRequest("http://localhost/api/agent/profiles", "POST", {}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Name is required");
  });

  it("rejects name shorter than 2 chars", async () => {
    const { POST } = await import("@/app/api/agent/profiles/route");
    const res = await POST(makeRequest("http://localhost/api/agent/profiles", "POST", { name: "a" }));
    expect(res.status).toBe(400);
  });

  it("rejects duplicate profile names", async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p.includes("/profiles/existing")) return true;
      return false;
    });

    const { POST } = await import("@/app/api/agent/profiles/route");
    const res = await POST(makeRequest("http://localhost/api/agent/profiles", "POST", {
      name: "Existing",
    }));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("already exists");
  });

  it("creates a new profile with correct directory structure", async () => {
    const { POST } = await import("@/app/api/agent/profiles/route");
    const res = await POST(makeRequest("http://localhost/api/agent/profiles", "POST", {
      name: "Research Assistant",
      description: "Academic research",
    }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.slug).toBe("research-assistant");

    // Verify directories were created
    expect(mockMkdirSync).toHaveBeenCalled();
    // Verify SOUL.md was written
    expect(mockWriteFileSync).toHaveBeenCalled();
  });

  it("clones from an existing profile when cloneFrom is specified", async () => {
    mockExistsSync.mockImplementation((p: string) => {
      if (p.includes("/profiles/source-agent/config.yaml")) return true;
      if (p.includes("/profiles/source-agent/SOUL.md")) return true;
      return false;
    });
    mockReadFileSync.mockReturnValue("# Source Agent\n");

    const { POST } = await import("@/app/api/agent/profiles/route");
    const res = await POST(makeRequest("http://localhost/api/agent/profiles", "POST", {
      name: "Cloned Agent",
      cloneFrom: "source-agent",
    }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.slug).toBe("cloned-agent");

    // Should have read from the source profile
    expect(mockReadFileSync).toHaveBeenCalled();
  });
});
