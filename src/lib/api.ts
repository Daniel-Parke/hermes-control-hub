// ═══════════════════════════════════════════════════════════════
// Control Hub — API Utilities
// ═══════════════════════════════════════════════════════════════

/**
 * Typed fetch wrapper with error handling and loading states.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      body?.error || `GET ${url} failed (${res.status})`,
      res.status,
      body
    );
  }
  return res.json();
}

export async function apiPut<T>(url: string, data: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      body?.error || `PUT ${url} failed (${res.status})`,
      res.status,
      body
    );
  }
  return res.json();
}

export async function apiPost<T>(url: string, data?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      body?.error || `POST ${url} failed (${res.status})`,
      res.status,
      body
    );
  }
  return res.json();
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      body?.error || `DELETE ${url} failed (${res.status})`,
      res.status,
      body
    );
  }
  return res.json();
}
