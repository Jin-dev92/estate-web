import type { BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { SESSION_COOKIE } from "../../lib/constants";
import { E2E_SESSION_TOKEN, E2E_OWNER_TOKEN } from "./e2e-constants";

// E2E 전용: httpOnly 세션 쿠키를 직접 주입해 인증 상태로 시작한다.
// 토큰은 base+uuid로 테스트마다 유니크 → 목이 상태를 토큰별 버킷으로 격리(프로필·알림
// 영속성이 병렬/3브라우저에서 서로 오염되지 않게). 역할 판별은 base 부분(.includes)로 유지.
async function injectSession(context: BrowserContext, base: string): Promise<void> {
  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: `${base}-${randomUUID()}`,
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
