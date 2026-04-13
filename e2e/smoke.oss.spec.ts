import { test, expect } from "@playwright/test";

test.describe("OSS smoke (Simple edition)", () => {
  test("dashboard loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("commercial path redirects away from operations UI", async ({ page }) => {
    await page.goto("/operations", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/edition-not-available$/);
  });
});
