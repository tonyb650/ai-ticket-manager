import { defineConfig, devices } from "@playwright/test";

const TEST_CLIENT_URL = "http://localhost:5174";
const TEST_SERVER_URL = "http://localhost:3031";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  globalSetup: "./global-setup.ts",
  use: {
    baseURL: TEST_CLIENT_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "bun --env-file=../e2e/.env.test run --filter server dev",
      url: `${TEST_SERVER_URL}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "bun run --filter client dev -- --port 5174 --strictPort",
      url: TEST_CLIENT_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        VITE_API_PROXY_TARGET: TEST_SERVER_URL,
      },
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
