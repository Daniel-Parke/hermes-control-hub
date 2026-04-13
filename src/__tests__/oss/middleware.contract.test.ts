/** @jest-environment node */
import { NextRequest } from "next/server";

describe("middleware (Simple edition)", () => {
  const prevMc = process.env.MC_EDITION;
  const prevPub = process.env.NEXT_PUBLIC_MC_EDITION;

  beforeEach(() => {
    process.env.MC_EDITION = "simple";
    process.env.NEXT_PUBLIC_MC_EDITION = "simple";
    jest.resetModules();
  });

  afterEach(() => {
    if (prevMc !== undefined) process.env.MC_EDITION = prevMc;
    else delete process.env.MC_EDITION;
    if (prevPub !== undefined) process.env.NEXT_PUBLIC_MC_EDITION = prevPub;
    else delete process.env.NEXT_PUBLIC_MC_EDITION;
  });

  it("redirects /operations to /edition-not-available", async () => {
    const { middleware } = await import("@/middleware");
    const req = new NextRequest("http://localhost/operations");
    const res = middleware(req);
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const loc = res.headers.get("location") || "";
    expect(loc).toMatch(/\/edition-not-available$/);
  });

  it("returns 404 JSON for commercial API under Simple edition", async () => {
    const { middleware } = await import("@/middleware");
    const req = new NextRequest("http://localhost/api/operations");
    const res = middleware(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});
