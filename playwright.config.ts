import { defineConfig, devices } from "@playwright/test";

const AUDIT_URL = process.env.AUDIT_URL?.trim();

export default defineConfig({
  testDir: "scripts/audit",
  testMatch: ["**/*.spec.ts"],
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 2,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["line"], ["html", { outputFolder: "playwright-report" }]],
  use: {
    headless: true,
    baseURL: AUDIT_URL || "http://127.0.0.1:3002",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Deshabilitar webServer si AUDIT_URL está definido (auditorías externas)
  webServer: AUDIT_URL
    ? undefined
    : {
        command: "pnpm exec next start -p 3002",
        url: "http://127.0.0.1:3002",
        timeout: 120000,
        reuseExistingServer: false,
      },
});
