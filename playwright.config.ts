import { defineConfig, devices } from "@playwright/test";

const NEXT_PORT = 3000;
const MOCK_BE_PORT = 3099;

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${NEXT_PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm e2e:mock-be",
      url: `http://localhost:${MOCK_BE_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "pnpm build && pnpm start",
      url: `http://localhost:${NEXT_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: { BACKEND_URL: `http://localhost:${MOCK_BE_PORT}` },
    },
  ],
});
