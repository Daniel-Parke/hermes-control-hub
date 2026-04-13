/** @jest-environment node */
import { mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

describe("resolveAllowedWorkspacePath", () => {
  it("allows paths under MC_DATA_DIR when set", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "mc-ws-"));
    const prevH = process.env.HERMES_HOME;
    const prevM = process.env.MC_DATA_DIR;
    const mcRoot = join(tmp, "mcdata");
    mkdirSync(join(mcRoot, "nested"), { recursive: true });
    process.env.HERMES_HOME = join(tmp, "hermes");
    process.env.MC_DATA_DIR = mcRoot;
    jest.resetModules();
    try {
      const { resolveAllowedWorkspacePath } = await import("@/lib/path-security");
      const sub = join(mcRoot, "nested");
      const r = resolveAllowedWorkspacePath(sub);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.absolute.length).toBeGreaterThan(0);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
      if (prevH !== undefined) process.env.HERMES_HOME = prevH;
      else delete process.env.HERMES_HOME;
      if (prevM !== undefined) process.env.MC_DATA_DIR = prevM;
      else delete process.env.MC_DATA_DIR;
      jest.resetModules();
    }
  });
});
