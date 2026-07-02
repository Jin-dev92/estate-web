import type { BrowserContext } from "@playwright/test";
import { SESSION_COOKIE } from "../../lib/constants";
import { E2E_SESSION_TOKEN, E2E_OWNER_TOKEN } from "./e2e-constants";

// E2E 전용: httpOnly 세션 쿠키를 직접 주입해 인증 상태로 시작한다.
async function injectSession(context: BrowserContext, token: string): Promise<void> {
  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

// TENANT 세션으로 시작(목 /auth/me가 TENANT를 반환).
// 하네스 인프라 — 인증된 페이지 테스트에서 로그인 UI 반복을 피한다.
export async function loginAs(context: BrowserContext): Promise<void> {
  await injectSession(context, E2E_SESSION_TOKEN);
}

// OWNER 세션으로 시작 — 목 /auth/me가 이 토큰이면 OWNER를 반환(대시보드 OWNER 홈 검증).
export async function loginAsOwner(context: BrowserContext): Promise<void> {
  await injectSession(context, E2E_OWNER_TOKEN);
}
