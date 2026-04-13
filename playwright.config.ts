import { defineConfig, devices } from "@playwright/test";

const ossOnly = process.env.PLAYWRIGHT_OSS_ONLY === "1";

export default defineConfig({
  testDir: "./e2e",
  testMatch: ossOnly ? "**/smoke.oss.spec.ts" : "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: ossOnly
      ? "cross-env MC_EDITION=simple NEXT_PUBLIC_MC_EDITION=simple npm run start"
      : "cross-env MC_EDITION=commercial NEXT_PUBLIC_MC_EDITION=commercial npm run start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
