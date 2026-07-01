import type { BrowserContext } from "@playwright/test";
import { SESSION_COOKIE } from "../../lib/constants";
import { E2E_SESSION_TOKEN } from "./e2e-constants";

// E2E 전용: httpOnly 세션 쿠키를 직접 주입해 인증 상태로 시작한다.
// 목 BE의 /auth/me가 무조건 응답하므로 토큰 값은 임의 문자열이어도 된다.
// 하네스 인프라 — 인증된 페이지 테스트(spec §6)에서 로그인 UI 반복을 피하기 위한 헬퍼. 현재 미사용이더라도 삭제하지 않는다.
export async function loginAs(context: BrowserContext): Promise<void> {
  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: E2E_SESSION_TOKEN,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
