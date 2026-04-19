/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor, act } from "@testing-library/react";
import { useApiData } from "@/hooks/useApiData";

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("useApiData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it("starts in loading state", () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useApiData("/api/test"));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("fetches data on mount", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { items: [1, 2, 3] } }),
    });

    const { result } = renderHook(() => useApiData("/api/test"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({ items: [1, 2, 3] });
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith("/api/test");
  });

  it("handles API errors", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    });

    const { result } = renderHook(() => useApiData("/api/test"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("Server error");
  });

  it("handles network errors", async () => {
    mockFetch.mockRejectedValue(new Error("Network failure"));

    const { result } = renderHook(() => useApiData("/api/test"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Network failure");
  });

  it("supports refetch", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: "first" }),
    });

    const { result } = renderHook(() => useApiData("/api/test"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: "second" }),
    });

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.data).toBe("second");
    });
  });

  it("does not fetch when autoFetch is false", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useApiData("/api/test", { autoFetch: false }));

    expect(result.current.loading).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
