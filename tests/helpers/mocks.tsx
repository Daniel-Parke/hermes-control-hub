/**
 * Shared jest.mock factories (U1, T-0115).
 *
 * Each function here is one stanza that appeared IDENTICALLY, byte for byte, in
 * enough test files to be worth a name. Nothing here is a general-purpose mock:
 * a target with several shapes keeps them, because a mock with a per-file
 * factory is testing something its neighbour is not.
 *
 * Call them through `require` inside the factory, never through an import:
 *
 *   jest.mock("lucide-react", () => require("../helpers/mocks").lucideMock());
 *
 * `jest.mock` is hoisted above every import in the file, so an imported binding
 * is not guaranteed to be initialised when the factory runs. `require` inside
 * the factory is the form jest documents for exactly this, and it keeps the
 * mock OPT-IN: a file that wants the real module simply does not call.
 *
 * Every factory builds a fresh object per call. A shared instance would leak a
 * `mockReturnValueOnce` from one file into the next, which is the thing jest's
 * per-file module registry exists to prevent.
 */
import type { ReactElement, ReactNode } from "react";

/**
 * Every lucide icon, as a component rendering a named svg.
 *
 * A Proxy rather than a list, so a test never has to enumerate the icons the
 * component under test happens to import; adding an icon to a screen does not
 * break its test. `data-icon` carries the name so an assertion can tell one
 * icon from another, and `aria-hidden` matches what the real package renders,
 * so the icon-button name gate reads the same tree the browser would.
 */
export function lucideMock(): Record<string, unknown> {
  const icon = (name: string) =>
    function Icon(props: Record<string, unknown>) {
      return <svg data-icon={name} aria-hidden="true" {...props} />;
    };
  return new Proxy({}, { get: (_t, prop: string) => icon(prop) });
}

/** The page frame as a plain div: 29 pages wear it and no test is about it. */
export function appPageShellMock(): {
  __esModule: true;
  default: (props: { children: ReactNode; header?: ReactNode }) => ReactElement;
} {
  return {
    __esModule: true,
    // `header` is rendered, not dropped. It is a PROP rather than a child
    // (T-0117), so a mock that only forwarded children would silently erase
    // every page's title, subtitle and header actions — and the assertions
    // that look for them would then be passing against nothing.
    default: ({ children, header }: { children: ReactNode; header?: ReactNode }) => (
      <div>
        {header}
        {children}
      </div>
    ),
  };
}

/**
 * next/link as a real anchor.
 *
 * The rest of the props are spread through deliberately: several call sites
 * assert on `aria-current` or a className that the component puts on the Link,
 * and a mock that dropped them would make those assertions pass against
 * nothing.
 */
export function nextLinkMock(): {
  __esModule: true;
  default: (props: { href: string; children: ReactNode } & Record<string, unknown>) => ReactElement;
} {
  return {
    __esModule: true,
    default: ({
      href,
      children,
      ...rest
    }: { href: string; children: ReactNode } & Record<string, unknown>) => (
      <a href={href} {...rest}>
        {children}
      </a>
    ),
  };
}

/**
 * next/server's NextResponse, small enough to assert against.
 *
 * The real one needs a Request/Response environment a node test does not have.
 * This keeps the two things a route test reads: the status, and a body it can
 * await.
 */
export function nextServerMock(): {
  NextResponse: {
    new (status: number, body: unknown): { status: number; body: unknown; json(): Promise<unknown> };
    json(data: unknown, init?: { status?: number }): {
      status: number;
      body: unknown;
      json(): Promise<unknown>;
    };
  };
} {
  class NextResponse {
    status: number;
    body: unknown;
    constructor(status: number, body: unknown) {
      this.status = status;
      this.body = body;
    }
    async json() {
      return this.body;
    }
    static json(data: unknown, init?: { status?: number }) {
      return new NextResponse(init?.status ?? 200, data);
    }
  }
  return { NextResponse } as never;
}

/** The data directory, pinned under /tmp so no test reads the operator's own. */
export function pathsMock() {
  return {
    PS_DATA_DIR: "/tmp/ch-data",
    PATHS: {
      missions: "/tmp/ch-data/missions",
      patterStageDb: "/tmp/ch-data/control-hub.db",
      templates: "/tmp/ch-data/templates",
      stories: "/tmp/ch-data/stories",
      recroom: "/tmp/ch-data/recroom",
      workspaces: "/tmp/ch-data/workspaces",
      auditLog: "/tmp/ch-data/audit",
      psScripts: "/tmp/ch-data/scripts",
      psHardwareLogs: "/tmp/ch-data/logs",
    },
    getPsScriptsDir: () => "/tmp/ch-data/scripts",
    getPsHardwareLogDir: () => "/tmp/ch-data/logs",
  };
}

/**
 * The Hermes adapter's paths and endpoints, pinned under /tmp/test-hermes.
 *
 * `jest.fn()` rather than plain functions, because several call sites do
 * `jest.mocked(getActiveHermesPaths).mockReturnValueOnce(...)` to test what
 * happens when the layout is different.
 */
export function agentRuntimeMock() {
  return {
    getActiveHermesPaths: jest.fn(() => ({
      root: "/tmp/test-hermes",
      config: "/tmp/test-hermes/config.yaml",
      backups: "/tmp/test-hermes/backups",
      env: "/tmp/test-hermes/.env",
      soul: "/tmp/test-hermes/SOUL.md",
      hermes: "/tmp/test-hermes/HERMES.md",
      agents: "/tmp/test-hermes/AGENTS.md",
      skills: "/tmp/test-hermes/skills",
      profiles: "/tmp/test-hermes/profiles",
      sessions: "/tmp/test-hermes/sessions",
      logs: "/tmp/test-hermes/logs",
      cronJobs: "/tmp/test-hermes/cron/jobs.json",
      memoryDb: "/tmp/test-hermes/memory_store.db",
    })),
    getActiveHermesHome: jest.fn(() => "/tmp/test-hermes"),
    getAgentLlmEndpoints: jest.fn(() => ({
      apiUrl: "http://127.0.0.1:9/v1/chat/completions",
      gatewayBase: "http://127.0.0.1:9",
    })),
  };
}
