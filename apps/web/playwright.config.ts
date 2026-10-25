import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const testDir = defineBddConfig({
  features: "e2e/features/**/*.feature",
  steps: "e2e/steps/**/*.steps.ts"
});

export default defineConfig({
  testDir,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: [
    {
      command: "pnpm --filter @centris/api start",
      url: "http://localhost:3001/api/salud",
      reuseExistingServer: !process.env.CI,
      timeout: 30000
    },
    {
      command: "pnpm --filter @centris/web start",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 30000
    }
  ]
});
