/** @jest-environment jsdom */

// ═══════════════════════════════════════════════════════════════
// Story Weaver reader: what a Stop still failed to stop, and what it left
// behind. Both were found by driving the real reader, not by reading it.
//
// (1) STOP VANISHED WHILE A CALL WAS STILL BILLING. `generating` was one
//     boolean shared by two paths. The header offers Retry beside Stop with
//     nothing disabling it, so a generate and a retry can both be on the wire.
//     Whichever settled first ran `setGenerating(false)`, the header dropped
//     Stop, and the other call ran on with no control left that could abort it.
//     Stop belongs to a COUNT of calls in flight, not to a boolean.
//
// (2) A STOP LEFT THE READER READING A STORY THE SERVER NO LONGER HELD. The
//     abort path set some flags and returned, reloading nothing. Whatever the
//     server did with the chapter never reached the screen, and the write
//     buttons went on offering a chapter number from before the Stop. That
//     matters because the write call names no chapter: the server writes the
//     first PENDING one, so a stale screen bills a chapter the operator did
//     not press.
//
// The double is global fetch. The page, the view derivation and every reader
// component are real, so what these assert is what a person sees and clicks.
// ═══════════════════════════════════════════════════════════════

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("lucide-react", () => {
  // Icons leave the accessibility tree, so an icon-only button that names
  // itself with `title` still resolves by its accessible name.
  const passthrough = () => () => null;
  return new Proxy({}, { get: () => passthrough() });
});

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: jest.fn(), back: jest.fn() }),
  useParams: () => ({ id: "S-1" }),
  usePathname: () => "/recroom/story-weaver/S-1",
  useSearchParams: () => new URLSearchParams(),
}));

import StoryReaderPage from "@/app/recroom/story-weaver/[id]/page";

// ── the story double ────────────────────────────────────────────

interface Chapter {
  number: number;
  title: string;
  status: string;
  wordCount: number;
  error?: string;
}

function story(chapters: Chapter[]) {
  return {
    id: "S-1",
    title: "Salt and Starlight",
    status: "active",
    chapters,
    chapterContents: Object.fromEntries(
      chapters
        .filter((c) => c.status === "complete")
        .map((c) => [String(c.number), `Text of chapter ${c.number}.`]),
    ) as Record<string, string>,
  };
}

/** One failed chapter and two still waiting: both Retry and Write are offered. */
function oneFailedTwoPending() {
  return story([
    { number: 1, title: "The Departure", status: "complete", wordCount: 100 },
    { number: 2, title: "Chapter 2", status: "failed", wordCount: 0, error: "The gateway is not reachable." },
    { number: 3, title: "Chapter 3", status: "pending", wordCount: 0 },
    { number: 4, title: "Chapter 4", status: "pending", wordCount: 0 },
  ]);
}

/** Two written, two waiting. */
function halfWritten() {
  return story([
    { number: 1, title: "The Departure", status: "complete", wordCount: 100 },
    { number: 2, title: "The Signal", status: "complete", wordCount: 100 },
    { number: 3, title: "Chapter 3", status: "pending", wordCount: 0 },
    { number: 4, title: "Chapter 4", status: "pending", wordCount: 0 },
  ]);
}

// ── the fetch double ────────────────────────────────────────────

type Body = Record<string, unknown>;

interface Parked {
  action: string;
  signal: AbortSignal | undefined;
  /** Answer this call as the server would. */
  resolve: (body: unknown) => void;
}

const fetchMock = jest.fn<Promise<unknown>, [string, RequestInit?]>();
let current: ReturnType<typeof story>;
/** Every generating call still on the wire, in the order it was made. */
let parked: Parked[] = [];

function ok(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

function markComplete(number: number): void {
  const chapter = current.chapters.find((c) => c.number === number);
  if (!chapter) return;
  chapter.status = "complete";
  chapter.error = undefined;
  current.chapterContents[String(number)] = `Text of chapter ${number}.`;
  current = { ...current, chapters: [...current.chapters] };
}

/** Complete the first pending chapter, as the server would. */
function writeNextChapter(): void {
  const next = current.chapters.find((c) => c.status === "pending");
  if (next) markComplete(next.number);
}

function park(action: string, init: RequestInit | undefined): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const signal = init?.signal ?? undefined;
    // A real fetch rejects with AbortError the moment its signal aborts. That
    // rejection IS the Stop, on every path that bills.
    signal?.addEventListener("abort", () => {
      const err = new Error("The operation was aborted.");
      err.name = "AbortError";
      reject(err);
    });
    parked.push({ action, signal, resolve });
  });
}

function installFetch(): void {
  fetchMock.mockImplementation(async (_url, init) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as Body;
    switch (body.action) {
      case "load":
        return ok({ data: current });
      case "sync-titles":
        return ok({ data: { synced: 0 } });
      case "update":
      case "spend":
        return ok({ data: current });
      case "generate-chapter":
      case "retry-chapter":
        return park(String(body.action), init);
      default:
        return ok({ data: {} });
    }
  });
}

function bodies(): Body[] {
  return fetchMock.mock.calls.map((c) => JSON.parse(String(c[1]?.body ?? "{}")) as Body);
}

function callsFor(action: string): Body[] {
  return bodies().filter((b) => b.action === action);
}

function parkedFor(action: string): Parked[] {
  return parked.filter((p) => p.action === action);
}

async function mount(initial: ReturnType<typeof story>) {
  current = initial;
  const utils = render(<StoryReaderPage />);
  await screen.findByRole("heading", { level: 1 });
  return utils;
}

beforeEach(() => {
  jest.clearAllMocks();
  parked = [];
  window.localStorage.clear();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;
  installFetch();
});

// ═══════════════════════════════════════════════════════════════
// (1) Stop is offered while ANY call is in flight, not while the last one is
// ═══════════════════════════════════════════════════════════════

describe("two calls on the wire", () => {
  it("still offers Stop when the first settles and the second is still running", async () => {
    await mount(oneFailedTwoPending());

    fireEvent.click(await screen.findByRole("button", { name: "Write chapter 3" }));
    await waitFor(() => expect(parkedFor("generate-chapter")).toHaveLength(1));

    // Retry sits beside Stop with nothing disabling it, so this is a click the
    // product allows, not a contrivance.
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    await waitFor(() => expect(parkedFor("retry-chapter")).toHaveLength(1));

    // The generate finishes. The retry is still running, and still billing.
    await act(async () => {
      writeNextChapter();
      parkedFor("generate-chapter")[0].resolve(ok({ data: { story: current } }));
      await Promise.resolve();
    });

    expect(await screen.findByRole("button", { name: "Stop" })).toBeInTheDocument();
  });

  it("aborts the call that is still running when that Stop is pressed", async () => {
    await mount(oneFailedTwoPending());

    fireEvent.click(await screen.findByRole("button", { name: "Write chapter 3" }));
    await waitFor(() => expect(parkedFor("generate-chapter")).toHaveLength(1));
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    await waitFor(() => expect(parkedFor("retry-chapter")).toHaveLength(1));

    await act(async () => {
      writeNextChapter();
      parkedFor("generate-chapter")[0].resolve(ok({ data: { story: current } }));
      await Promise.resolve();
    });

    fireEvent.click(await screen.findByRole("button", { name: "Stop" }));
    await waitFor(() => expect(parkedFor("retry-chapter")[0].signal?.aborted).toBe(true));
  });
});

// ═══════════════════════════════════════════════════════════════
// (2) a Stop re-reads the story, because the server moved and the screen did not
// ═══════════════════════════════════════════════════════════════

describe("after a Stop", () => {
  it("re-reads the story, so the write buttons describe what the server holds", async () => {
    await mount(halfWritten());

    fireEvent.click(await screen.findByRole("button", { name: "Write chapter 3" }));
    await waitFor(() => expect(parkedFor("generate-chapter")).toHaveLength(1));
    const loadsBefore = callsFor("load").length;

    // The Stop landed after the provider had already answered, so chapter 3
    // was written and billed. This is reachable: the abort can arrive during
    // the title or the summary call, and generate.ts catches both.
    markComplete(3);
    fireEvent.click(await screen.findByRole("button", { name: "Stop" }));

    await waitFor(() => expect(callsFor("load").length).toBeGreaterThan(loadsBefore));
    // The next write is offered on chapter 4, which is the chapter the server
    // would actually write. Offering chapter 3 here is the money bug: the call
    // names no chapter, so it would write and bill chapter 4 regardless.
    expect(await screen.findByRole("button", { name: "Write chapter 4" })).toBeInTheDocument();
    expect(screen.getByTitle("Chapter 3: Chapter 3 (complete)")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════
// GREEN CONTROL: nothing above may make Stop appear when nothing is running
// ═══════════════════════════════════════════════════════════════

describe("GREEN CONTROL", () => {
  it("offers no Stop on a story nobody has asked to write", async () => {
    await mount(halfWritten());

    expect(screen.queryByRole("button", { name: "Stop" })).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Write chapter 3" })).toBeInTheDocument();
  });

  it("takes Stop away once the only call in flight settles", async () => {
    await mount(halfWritten());

    fireEvent.click(await screen.findByRole("button", { name: "Write chapter 3" }));
    await waitFor(() => expect(parkedFor("generate-chapter")).toHaveLength(1));
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();

    await act(async () => {
      writeNextChapter();
      parkedFor("generate-chapter")[0].resolve(ok({ data: { story: current } }));
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.queryByRole("button", { name: "Stop" })).not.toBeInTheDocument());
  });
});
