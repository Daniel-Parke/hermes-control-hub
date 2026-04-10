// ═══════════════════════════════════════════════════════════════
// API Logger — consistent error logging for API routes
// ═══════════════════════════════════════════════════════════════

/**
 * Log an API error with context. Use in catch blocks instead of
 * empty `catch {}` to ensure errors are visible during debugging.
 *
 * @param route - API route name (e.g., "GET /api/cron")
 * @param context - What was being done (e.g., "reading jobs.json")
 * @param error - The caught error
 */
export function logApiError(route: string, context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[API ${route}] Error ${context}: ${message}`);
}

/**
 * Safely parse JSON with error logging.
 * Returns null on parse failure instead of throwing.
 */
export function safeJsonParse<T>(text: string, route: string, context: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    logApiError(route, `parsing JSON ${context}`, error);
    return null;
  }
}

/**
 * Safely read and parse a JSON file.
 * Returns null if file doesn't exist or parse fails.
 */
export function safeReadJsonFile<T>(path: string, route: string): T | null {
  try {
    const { readFileSync, existsSync } = require("fs");
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch (error) {
    logApiError(route, `reading ${path}`, error);
    return null;
  }
}
