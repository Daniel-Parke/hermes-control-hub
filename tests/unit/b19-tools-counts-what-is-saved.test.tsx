/** @jest-environment jsdom */

/**
 * T-0113: the Tools screen reported a state that was not stored.
 *
 * Toggling a chip moved the header count and the Enabled tile immediately, and
 * nothing on the screen said there was anything to save. So a reader who
 * toggled two toolsets and walked away was told, by two counters, that their
 * agent had them, and the agent did not. The page already knew: `toolsetsDirty`
 * was computed and used only to guard a profile switch, and was never rendered.
 *
 * What these pin: the counters describe the SAVED list, the screen says when
 * there is unsaved work, and saving is what moves the numbers.
 */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  usePathname: () => "/agent/tools",
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("@/components/layout/AppPageShell", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("lucide-react", () => {
  const icon = (name: string) =>
    function Icon(props: Record<string, unknown>) {
      return <svg data-icon={name} aria-hidden="true" {...props} />;
    };
  return new Proxy({}, { get: (_t, prop: string) => icon(prop) });
});

/** The Enabled tile is a number this page hands over; capture what it is told. */
const insightsProps: { total: number; enabled: number }[] = [];
jest.mock("@/modules/hermes/components/ToolsInsights", () => ({
  __esModule: true,
  default: (props: { total: number; enabled: number }) => {
    insightsProps.push(props);
    return <div data-testid="tools-insights">{props.enabled}</div>;
  },
}));
jest.mock("@/components/ui/ProfileSelector", () => ({
  __esModule: true,
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select aria-label="Profile" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="default">Bob</option>
      <option value="qa">QA Engineer</option>
    </select>
  ),
}));

const mockApiFetch = jest.fn();
const mockSafeApiCallData = jest.fn();
jest.mock("@/lib/api-fetch", () => ({
  ...(jest.requireActual("@/lib/api-fetch") as Record<string, unknown>),
  apiFetch: (...a: unknown[]) => mockApiFetch(...a),
  safeApiCallData: (...a: unknown[]) => mockSafeApiCallData(...a),
}));

import ToolsPage from "@/app/agent/tools/page";
import { setSelectedProfile } from "@/hooks/useSelectedProfile";

/** What the server holds. A PUT replaces it, so the reload after a save sees it. */
let stored: string[] = [];

function answerToolsets(initial: string[]) {
  stored = [...initial];
  mockApiFetch.mockImplementation(async (path: string, init?: { method?: string; body?: string }) => {
    if (path.includes("/toolsets") && init?.method === "PUT") {
      const body = JSON.parse(String(init.body)) as { platformToolsets: Record<string, string[]> };
      stored = Object.values(body.platformToolsets)[0] ?? [];
      return { data: { success: true } };
    }
    if (path.includes("/toolsets")) {
      return {
        data: {
          platformToolsets: { cli: stored },
          unifiedEnabled: stored,
          source: "database",
          platformsDiverged: false,
        },
      };
    }
    return { data: { success: true } };
  });
  mockSafeApiCallData.mockResolvedValue({ profiles: [] });
}

function chip(label: string): HTMLButtonElement {
  const found = screen
    .getAllByRole("button")
    .find((b) => (b.textContent ?? "").trim().startsWith(label));
  if (!found) throw new Error(`no chip labelled ${label}`);
  return found as HTMLButtonElement;
}

async function renderLoaded(initial: string[]) {
  answerToolsets(initial);
  render(<ToolsPage />);
  await waitFor(() => expect(screen.getByText("Enabled toolsets")).toBeInTheDocument());
}

/** The number the Enabled tile was last given. */
const lastEnabledTile = () => insightsProps[insightsProps.length - 1]?.enabled;

beforeEach(() => {
  jest.clearAllMocks();
  insightsProps.length = 0;
  // The selection is shared across the agent screens now, so it outlives a
  // render. Put it back to the root agent, as a fresh page load would.
  setSelectedProfile("default");
});

describe("with nothing changed", () => {
  it("counts the toolsets the profile actually has", async () => {
    await renderLoaded(["web", "vision"]);

    expect(screen.getByText(/2 toolsets enabled/i)).toBeInTheDocument();
    expect(lastEnabledTile()).toBe(2);
  });

  it("GREEN CONTROL: says nothing about unsaved work", async () => {
    await renderLoaded(["web", "vision"]);

    expect(screen.queryByText(/unsaved changes/i)).toBeNull();
  });
});

describe("with a chip toggled and not yet saved", () => {
  it("says there are unsaved changes", async () => {
    await renderLoaded(["web"]);

    fireEvent.click(chip("Vision"));

    expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
  });

  it("does not let the header count claim it", async () => {
    await renderLoaded(["web"]);

    fireEvent.click(chip("Vision"));

    // One is stored. The chip shows the choice; the count must not.
    expect(screen.getByText(/1 toolset enabled/i)).toBeInTheDocument();
    expect(screen.queryByText(/2 toolsets enabled/i)).toBeNull();
  });

  it("does not let the Enabled tile claim it either", async () => {
    await renderLoaded(["web"]);

    fireEvent.click(chip("Vision"));

    expect(lastEnabledTile()).toBe(1);
  });

  it("counts a toolset turned OFF as still stored until the save", async () => {
    await renderLoaded(["web", "vision"]);

    fireEvent.click(chip("Vision"));

    expect(screen.getByText(/2 toolsets enabled/i)).toBeInTheDocument();
    expect(lastEnabledTile()).toBe(2);
    expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
  });

  it("says the same about a hand-edited JSON payload", async () => {
    await renderLoaded(["web"]);
    fireEvent.click(screen.getByRole("button", { name: /Show advanced JSON/i }));
    const box = await screen.findByLabelText("Advanced toolsets JSON");

    fireEvent.change(box, { target: { value: '{"cli":["web","terminal"]}' } });

    expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
    expect(screen.getByText(/1 toolset enabled/i)).toBeInTheDocument();
  });
});

describe("after the save", () => {
  it("moves the counters and drops the marker", async () => {
    await renderLoaded(["web"]);
    fireEvent.click(chip("Vision"));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Save & push toolsets/i }));
    });

    await waitFor(() => expect(screen.getByText(/2 toolsets enabled/i)).toBeInTheDocument());
    expect(lastEnabledTile()).toBe(2);
    expect(screen.queryByText(/unsaved changes/i)).toBeNull();
  });
});
