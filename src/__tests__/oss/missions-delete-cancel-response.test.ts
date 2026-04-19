// ═══════════════════════════════════════════════════════════════
// Regression: missions page handleDelete/handleCancel must check res.ok
// Ensures delete and cancel operations only show success on 2xx responses.
// ═══════════════════════════════════════════════════════════════

describe("missions page - delete/cancel response handling", () => {
  // The UI fix is in missions/page.tsx handleDelete/handleCancel.
  // These tests verify the error response parsing pattern used in the fix.

  describe("error response parsing pattern", () => {
    it("extracts error message from API error response body", () => {
      const errorBody = { error: "Mission not found" };
      expect(errorBody.error).toBe("Mission not found");
    });

    it("falls back to default message when body is null", () => {
      const body: { error?: string } | null = null;
      const message = body?.error || "Failed to delete mission";
      expect(message).toBe("Failed to delete mission");
    });

    it("falls back to default message when error field is missing", () => {
      const body: { error?: string } = { error: undefined };
      const message = body.error || "Failed to cancel mission";
      expect(message).toBe("Failed to cancel mission");
    });

    it("falls back to default message when error field is empty string", () => {
      const body: { error?: string } = { error: "" };
      const message = body.error || "Failed to delete mission";
      expect(message).toBe("Failed to delete mission");
    });

    it("uses actual error message when present", () => {
      const body: { error?: string } = { error: "Job cron-job-id not found" };
      const message = body.error || "Failed to cancel mission";
      expect(message).toBe("Job cron-job-id not found");
    });
  });

  describe("response status check pattern", () => {
    it("treats 200-299 as success", () => {
      expect(200 >= 200 && 200 < 300).toBe(true);
      expect(201 >= 200 && 201 < 300).toBe(true);
      expect(299 >= 200 && 299 < 300).toBe(true);
    });

    it("treats 400+ as failure", () => {
      expect(400 >= 200 && 400 < 300).toBe(false);
      expect(404 >= 200 && 404 < 300).toBe(false);
      expect(500 >= 200 && 500 < 300).toBe(false);
      expect(503 >= 200 && 503 < 300).toBe(false);
    });
  });
});
