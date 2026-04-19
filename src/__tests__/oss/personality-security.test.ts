/** @jest-environment node */
import { NextRequest } from "next/server";

// We test the route handler directly by importing it
// and verifying its behavior through the exported PUT function.

describe("personality route security", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ── Auth enforcement ──────────────────────────────────────────

  it("rejects requests without API key when CH_API_KEY is set", async () => {
    process.env.CH_API_KEY = "test-secret";
    // Dynamic import to pick up env changes
    const { PUT } = await import("@/app/api/agent/personality/route");

    const request = new NextRequest("http://localhost/api/agent/personality", {
      method: "PUT",
      body: JSON.stringify({ personality: "friendly" }),
    });

    const response = await PUT(request);
    expect(response.status).toBe(401);
  });

  it("rejects requests with wrong API key", async () => {
    process.env.CH_API_KEY = "test-secret";
    const { PUT } = await import("@/app/api/agent/personality/route");

    const request = new NextRequest("http://localhost/api/agent/personality", {
      method: "PUT",
      headers: { "x-ch-api-key": "wrong-key" },
      body: JSON.stringify({ personality: "friendly" }),
    });

    const response = await PUT(request);
    expect(response.status).toBe(401);
  });

  // ── Read-only mode ───────────────────────────────────────────

  it("rejects writes when CH_READ_ONLY is set", async () => {
    process.env.CH_READ_ONLY = "true";
    delete process.env.CH_API_KEY;
    const { PUT } = await import("@/app/api/agent/personality/route");

    const request = new NextRequest("http://localhost/api/agent/personality", {
      method: "PUT",
      body: JSON.stringify({ personality: "friendly" }),
    });

    const response = await PUT(request);
    expect(response.status).toBe(503);
  });

  // ── Path traversal prevention ─────────────────────────────────

  it("rejects profile names with path traversal (../)", async () => {
    delete process.env.CH_API_KEY;
    delete process.env.CH_READ_ONLY;
    const { PUT } = await import("@/app/api/agent/personality/route");

    const request = new NextRequest("http://localhost/api/agent/personality", {
      method: "PUT",
      body: JSON.stringify({ profile: "../etc", personality: "friendly" }),
    });

    const response = await PUT(request);
    // resolveSafeProfileName rejects ".." in the name
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/invalid/i);
  });

  it("rejects profile names with slashes", async () => {
    delete process.env.CH_API_KEY;
    delete process.env.CH_READ_ONLY;
    const { PUT } = await import("@/app/api/agent/personality/route");

    const request = new NextRequest("http://localhost/api/agent/personality", {
      method: "PUT",
      body: JSON.stringify({ profile: "foo/bar", personality: "friendly" }),
    });

    const response = await PUT(request);
    expect(response.status).toBe(400);
  });

  it("rejects empty personality", async () => {
    delete process.env.CH_API_KEY;
    delete process.env.CH_READ_ONLY;
    const { PUT } = await import("@/app/api/agent/personality/route");

    const request = new NextRequest("http://localhost/api/agent/personality", {
      method: "PUT",
      body: JSON.stringify({ personality: "" }),
    });

    const response = await PUT(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/personality is required/i);
  });
});
