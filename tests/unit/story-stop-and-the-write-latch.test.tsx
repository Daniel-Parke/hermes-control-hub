/** @jest-environment jsdom */

// ═══════════════════════════════════════════════════════════════
// Story Weaver reader: two money bugs, both found driving a real agent.
//
// (1) STOP WAS INERT DURING A RETRY. The header offers Stop while a retry runs
//     (it reads `generating`), but retryChapter fetched with no AbortSignal and
//     registered no controller, so Stop cleared a flag and aborted nothing. The
//     operator watched a billed generation run to completion with no way in.
//
// (2) THE WRITE LATCH SURVIVED ITS RUN. `writing` is the operator's standing
//     intent to keep writing. "Keep writing" set it; only Stop or an abort
//     cleared it. A run that ENDED on its own left it set: every chapter
//     written, or the three-failure ceiling pausing the loop. The next thing to
//     put a pending chapter back in front of the auto-write effect then resumed
//     the loop unasked. Retry is exactly that thing, and the paused banner
//     tells the operator to press it.
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
      chapters.filter((c) => c.status === "complete").map((c) => [String(c.number), `Text of chapter ${c.number}.`]),
    ) as Record<string, string>,
  };
}

/** One chapter failed, nothing pending: the story a Retry is pressed on. */
function oneFailed() {
  return story([
    { number: 1, title: "The Departure", status: "complete", wordCount: 100 },
    { number: 2, title: "Chapter 2", status: "failed", wordCount: 0, error: "The gateway is not reachable." },
    { number: 3, title: "Landfall", status: "complete", wordCount: 100 },
  ]);
}

/** One failed chapter AND two still waiting: the shape the loop can run away on. */
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

const fetchMock = jest.fn<Promise<unknown>, [string, RequestInit?]>();
let current: ReturnType<typeof story>;
/** Resolvers for parked retry calls, so a Stop can be timed against one. */
let parkedRetries: Array<{ resolve: () => void; signal: AbortSignal | undefined }> = [];
/** When true, a retry call parks until the test resolves it. */
let holdRetry = false;
/** When true, generate-chapter answers with an error and writes nothing. */
let generateFails = false;
/**
 * Every generate-chapter call parks until the test answers it, one at a time.
 * A mock that answers in the same tick lets React batch `generating` true and
 * false into no change at all, and the loop then stalls in the test for a
 * reason the product does not have. Answering one call per `act` gives each
 * stage of the loop its own commit, the way a real request does.
 */
let parkedGenerates: Array<() => void> = [];

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

function installFetch(): void {
  fetchMock.mockImplementation(async (_url, init) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as Body;
    switch (body.action) {
      case "load":
        return ok({ data: current });
      case "sync-titles":
        return ok({ data: { synced: 0 } });
      case "update":
        return ok({ data: current });
      case "generate-chapter":
        return new Promise((resolve) => {
          parkedGenerates.push(() => {
            // A failed generate answers with an error and NO story, which is
            // what leaves the pending chapter in place and feeds the ceiling.
            if (generateFails) {
              resolve(ok({ error: "The gateway is not reachable." }));
              return;
            }
            writeNextChapter();
            resolve(ok({ data: { story: current } }));
          });
        });
      case "retry-chapter": {
        if (holdRetry) {
          return new Promise((resolve, reject) => {
            const signal = init?.signal ?? undefined;
            signal?.addEventListener("abort", () => {
              const err = new Error("The operation was aborted.");
              err.name = "AbortError";
              reject(err);
            });
            parkedRetries.push({
              signal,
              resolve: () => {
                markComplete(Number(body.chapterNumber));
                resolve(ok({ data: { story: current } }));
              },
            });
          });
        }
        markComplete(Number(body.chapterNumber));
        return ok({ data: { story: current } });
      }
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

async function mount(initial: ReturnType<typeof story>) {
  current = initial;
  const utils = render(<StoryReaderPage />);
  await screen.findByRole("heading", { level: 1 });
  return utils;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

/** Answer the generation that is on the wire, and let the reader react to it. */
async function answerGeneration(index: number): Promise<void> {
  await waitFor(() => expect(parkedGenerates.length).toBeGreaterThan(index));
  await act(async () => {
    parkedGenerates[index]();
    await Promise.resolve();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  parkedRetries = [];
  parkedGenerates = [];
  holdRetry = false;
  generateFails = false;
  window.localStorage.clear();
  (globalThis as { fetch?: unknown }).fetch = fetchMock;
  installFetch();
});

// ═══════════════════════════════════════════════════════════════
// (A) Stop stops a retry
// ═══════════════════════════════════════════════════════════════

describe("Stop during a retry", () => {
  it("aborts the retry that is on the wire", async () => {
    holdRetry = true;
    await mount(oneFailed());

    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    await waitFor(() => expect(parkedRetries).toHaveLength(1));

    // The reader offers Stop while a retry runs, so Stop has to mean it.
    fireEvent.click(await screen.findByRole("button", { name: "Stop" }));

    await waitFor(() => expect(parkedRetries[0].signal?.aborted).toBe(true), { timeout: 2000 });
  });

  it("puts the controls back and reports no failure, because a Stop is not one", async () => {
    holdRetry = true;
    await mount(oneFailed());

    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    await waitFor(() => expect(parkedRetries).toHaveLength(1));
    fireEvent.click(await screen.findByRole("button", { name: "Stop" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "Stop" })).not.toBeInTheDocument());
    expect(await screen.findByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByText(/Retry failed|aborted/i)).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════
// (B) the standing intent ends with the run it authorised
// ═══════════════════════════════════════════════════════════════

describe("a finished run leaves nothing armed", () => {
  it("stops offering Stop once the last chapter is written", async () => {
    await mount(halfWritten());
    fireEvent.click(await screen.findByRole("button", { name: "Keep writing (2 chapters left)" }));

    await answerGeneration(0);
    await answerGeneration(1);
    await flush();

    // Stop showing while nothing is running is not only a lie about the state.
    // It is the latch that lets a later action resume the loop.
    expect(callsFor("generate-chapter")).toHaveLength(2);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Stop" })).not.toBeInTheDocument());
  });
});

describe("a Retry after the ceiling paused the loop", () => {
  it("writes the chapter it was asked for and not the rest of the book", async () => {
    generateFails = true;
    await mount(oneFailedTwoPending());

    // The operator arms the loop. Every call fails, so the ceiling pauses it.
    fireEvent.click(await screen.findByRole("button", { name: "Keep writing (2 chapters left)" }));
    await answerGeneration(0);
    await answerGeneration(1);
    await answerGeneration(2);
    await flush();
    expect(callsFor("generate-chapter")).toHaveLength(3);
    expect(await screen.findByText(/Auto-generation paused/)).toBeInTheDocument();

    // The cause is fixed, and the operator does what the banner says: Retry.
    generateFails = false;
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    await waitFor(() => expect(callsFor("retry-chapter")).toHaveLength(1));
    await flush();
    await flush();

    // One chapter was asked for. One chapter is what gets billed: the two that
    // were still pending are still pending, and still offered as a choice.
    expect(callsFor("generate-chapter")).toHaveLength(3);
    expect(await screen.findByRole("button", { name: "Write chapter 3" })).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════
// GREEN CONTROL: the loop the operator DID ask for still runs
// ═══════════════════════════════════════════════════════════════

describe("GREEN CONTROL", () => {
  it("Keep writing still writes every remaining chapter", async () => {
    await mount(halfWritten());
    fireEvent.click(await screen.findByRole("button", { name: "Keep writing (2 chapters left)" }));

    await answerGeneration(0);
    await answerGeneration(1);

    expect(callsFor("generate-chapter")).toHaveLength(2);
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Write chapter|Keep writing/ })).not.toBeInTheDocument(),
    );
    // The reader stays on chapter 1; the dots are where the finished book shows.
    expect(screen.getByTitle("Chapter 4: Chapter 4 (complete)")).toBeInTheDocument();
  });

  it("a Retry that is left alone completes the chapter", async () => {
    await mount(oneFailed());
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));

    await waitFor(() => expect(callsFor("retry-chapter")).toHaveLength(1));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument());
  });
});
