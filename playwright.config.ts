import { defineConfig, devices } from "@playwright/test";

const NEXT_PORT = 3000;
const MOCK_BE_PORT = 3099;
const MOCK_WS_PORT = 3098;

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
      command: "pnpm e2e:mock-ws",
      url: `http://localhost:${MOCK_WS_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "pnpm build && pnpm start",
      url: `http://localhost:${NEXT_PORT}`,
      // 항상 새 서버를 띄워야 BACKEND_URL이 목 BE를 가리킴을 보장한다.
      // reuseExistingServer: true이면 next dev(:3000)가 살아있을 때 재사용하여
      // BACKEND_URL 없이 실 BE(:3001)를 바라보는 비결정적 동작이 발생한다.
      // NEXT_PUBLIC_WS_URL은 빌드타임에 baked → 채팅 클라가 목 WS(:3098)를 본다.
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        BACKEND_URL: `http://localhost:${MOCK_BE_PORT}`,
        NEXT_PUBLIC_WS_URL: `http://localhost:${MOCK_WS_PORT}`,
      },
    },
  ],
});
