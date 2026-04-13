/** @jest-environment node */
import { NextRequest } from "next/server";

describe("middleware (Simple edition)", () => {
  const prevMc = process.env.CH_EDITION;
  const prevPub = process.env.NEXT_PUBLIC_CH_EDITION;
  const prevCh = process.env.CH_EDITION;
  const prevPubCh = process.env.NEXT_PUBLIC_CH_EDITION;

  beforeEach(() => {
    delete process.env.CH_EDITION;
    delete process.env.NEXT_PUBLIC_CH_EDITION;
    process.env.CH_EDITION = "simple";
    process.env.NEXT_PUBLIC_CH_EDITION = "simple";
    jest.resetModules();
  });

  afterEach(() => {
    if (prevMc !== undefined) process.env.CH_EDITION = prevMc;
    else delete process.env.CH_EDITION;
    if (prevPub !== undefined) process.env.NEXT_PUBLIC_CH_EDITION = prevPub;
    else delete process.env.NEXT_PUBLIC_CH_EDITION;
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

  it("returns 404 JSON for commercial API under Simple edition", async () => {
    const { middleware } = await import("@/middleware");
    const req = new NextRequest("http://localhost/api/operations");
    const res = middleware(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("does not block commercial paths when CH_EDITION is commercial", async () => {
    delete process.env.CH_EDITION;
    delete process.env.NEXT_PUBLIC_CH_EDITION;
    process.env.CH_EDITION = "commercial";
    jest.resetModules();
    const { middleware } = await import("@/middleware");
    const req = new NextRequest("http://localhost/operations");
    const res = middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });
});
