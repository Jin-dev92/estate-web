import { defineConfig, devices } from "@playwright/test";

const NEXT_PORT = 3000;
const MOCK_BE_PORT = 3099;
const MOCK_WS_PORT = 3098;

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // CI 러너는 코어가 적어 3브라우저 fullyParallel이 경합 → 간헐 stall(테스트가 30s 기본
  // 타임아웃에 걸림). 워커를 2로 낮춰 경합을 줄이고, 콜드스타트 흡수용으로 테스트 타임아웃 상향.
  workers: process.env.CI ? 2 : undefined,
  timeout: process.env.CI ? 45_000 : 30_000,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  // CI Linux 러너의 webkit이 느려 기본 5s expect가 reload+SSR·소켓 연결에 빠듯 → 10s로 상향.
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${NEXT_PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  // 크로스브라우저 회귀 방지 — 3개 엔진(Chromium·Firefox·WebKit)에서 동일 스위트 실행.
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: [
    {
      command: "pnpm e2e:mock-be",
      url: `http://localhost:${MOCK_BE_PORT}/health`,
      // 항상 새로 기동한다(CI와 동일). 목 BE가 상태있는(게시판) 목이라, 이전 실행에서
      // 남은 stale 서버를 재사용하면 옛 상태를 답해 영속성 단언이 timeout 난다.
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "pnpm e2e:mock-ws",
      url: `http://localhost:${MOCK_WS_PORT}/health`,
      reuseExistingServer: false,
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
        // 프로덕션 빌드를 http로 띄우므로 secure 쿠키를 꺼야 webkit이 세션을 잡는다(lib/session.ts).
        E2E_INSECURE_COOKIE: "1",
      },
    },
  ],
});
