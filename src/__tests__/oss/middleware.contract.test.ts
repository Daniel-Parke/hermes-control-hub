/** @jest-environment node */
import { NextRequest } from "next/server";

describe("middleware (OSS edition)", () => {
  const prevCh = process.env.CH_EDITION;
  const prevPubCh = process.env.NEXT_PUBLIC_CH_EDITION;

  beforeEach(() => {
    process.env.CH_EDITION = "oss";
    process.env.NEXT_PUBLIC_CH_EDITION = "oss";
    jest.resetModules();
  });

  afterEach(() => {
    if (prevCh !== undefined) process.env.CH_EDITION = prevCh;
    else delete process.env.CH_EDITION;
    if (prevPubCh !== undefined) process.env.NEXT_PUBLIC_CH_EDITION = prevPubCh;
    else delete process.env.NEXT_PUBLIC_CH_EDITION;
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

  it("returns 404 JSON for restricted API routes", async () => {
    const { middleware } = await import("@/middleware");
    const req = new NextRequest("http://localhost/api/operations");
    const res = middleware(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});
