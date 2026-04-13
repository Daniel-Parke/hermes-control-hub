/** @jest-environment node */
import { mkdtempSync, mkdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { NextRequest } from "next/server";

function prepHome(): string {
  const tmpHome = mkdtempSync(join(tmpdir(), "mc-route-"));
  const dataRoot = join(tmpHome, "mission-control", "data");
  process.env.HERMES_HOME = tmpHome;
  process.env.MC_DATA_DIR = dataRoot;
  mkdirSync(join(tmpHome, "sessions"), { recursive: true });
  mkdirSync(join(dataRoot, "missions"), { recursive: true });
  mkdirSync(join(dataRoot, "templates"), { recursive: true });
  mkdirSync(join(dataRoot, "operations"), { recursive: true });
  return tmpHome;
}

function cleanup(tmpHome: string): void {
  rmSync(tmpHome, { recursive: true, force: true });
}

describe("GET /api/operations (commercial)", () => {
  let tmpHome: string;

  beforeEach(() => {
    tmpHome = prepHome();
    jest.resetModules();
  });

  afterEach(() => {
    cleanup(tmpHome);
  });

  it("GET /api/operations lists empty operations", async () => {
    const { GET } = await import("@/app/api/operations/route");
    const res = await GET(new NextRequest("http://localhost/api/operations"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.operations).toEqual([]);
    expect(body.data.total).toBe(0);
  });
});
