import { test, expect } from "@playwright/test";

test.describe("OSS smoke", () => {
  test("dashboard loads", async ({ page }) => {
    await page.goto("/");
    const title = page.locator("h1").filter({ hasText: "MISSION" });
    await expect(title).toBeVisible();
    await expect(title.getByText("CONTROL", { exact: true })).toBeVisible();
  });

  test("cron page loads", async ({ page }) => {
    await page.goto("/cron");
    await expect(page.getByRole("heading", { name: /Cron Jobs/i })).toBeVisible();
  });

  test("missions page loads", async ({ page }) => {
    await page.goto("/missions");
    await expect(
      page.getByRole("heading", { name: "Missions", exact: true })
    ).toBeVisible();
  });

  test("restricted path redirects away from operations UI", async ({ page }) => {
    await page.goto("/operations", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/edition-not-available$/);
  });
});
