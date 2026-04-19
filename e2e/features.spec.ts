import { test, expect } from "@playwright/test";

test.describe("Missions page", () => {
  test("loads missions list", async ({ page }) => {
    await page.goto("/missions");
    await expect(
      page.getByRole("heading", { name: "Missions", exact: true })
    ).toBeVisible();
  });

  test("shows mission templates", async ({ page }) => {
    await page.goto("/missions");
    // Templates should be visible in the dispatch section
    await expect(page.getByText(/Code Review|Research|Debug|Build/i).first()).toBeVisible();
  });

  test("can open create mission form", async ({ page }) => {
    await page.goto("/missions");
    const createBtn = page.getByRole("button", { name: /Create|New Mission|Draft/i });
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await expect(page.getByText(/Mission Name|Name/i).first()).toBeVisible();
    }
  });
});

test.describe("Cron page", () => {
  test("loads cron jobs list", async ({ page }) => {
    await page.goto("/cron");
    await expect(
      page.getByRole("heading", { name: /Cron Jobs/i })
    ).toBeVisible();
  });

  test("shows create job button", async ({ page }) => {
    await page.goto("/cron");
    await expect(
      page.getByRole("button", { name: /Create|New|Add/i }).first()
    ).toBeVisible();
  });
});

test.describe("Sessions page", () => {
  test("loads sessions list", async ({ page }) => {
    await page.goto("/sessions");
    await expect(
      page.getByRole("heading", { name: /Sessions/i })
    ).toBeVisible();
  });
});

test.describe("Config page", () => {
  test("loads config sections", async ({ page }) => {
    await page.goto("/config");
    await expect(
      page.getByRole("heading", { name: /Config|Settings/i }).first()
    ).toBeVisible();
  });

  test("shows config section cards", async ({ page }) => {
    await page.goto("/config");
    // Should show at least Agent and Model sections
    await expect(page.getByText("Agent").first()).toBeVisible();
  });
});

test.describe("Skills page", () => {
  test("loads skills browser", async ({ page }) => {
    await page.goto("/skills");
    await expect(
      page.getByRole("heading", { name: /Skills/i })
    ).toBeVisible();
  });
});

test.describe("Memory page", () => {
  test("loads memory page", async ({ page }) => {
    await page.goto("/memory");
    await expect(
      page.getByRole("heading", { name: /Memory/i })
    ).toBeVisible();
  });
});

test.describe("Gateway page", () => {
  test("loads gateway status", async ({ page }) => {
    await page.goto("/gateway");
    await expect(
      page.getByRole("heading", { name: /Gateway/i })
    ).toBeVisible();
  });
});

test.describe("Logs page", () => {
  test("loads logs viewer", async ({ page }) => {
    await page.goto("/logs");
    await expect(
      page.getByRole("heading", { name: /Logs/i })
    ).toBeVisible();
  });
});
