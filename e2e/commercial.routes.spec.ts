import { test, expect } from "@playwright/test";

test.describe("Commercial routes", () => {
  test("operations page loads in commercial build", async ({ page }) => {
    await page.goto("/operations");
    await expect(page.locator("body")).toBeVisible();
    await expect(page).not.toHaveURL(/edition-not-available/);
  });
});
