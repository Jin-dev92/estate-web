import type { BrowserContext } from "@playwright/test";
import { SESSION_COOKIE } from "../../lib/constants";

// E2E 전용: httpOnly 세션 쿠키를 직접 주입해 인증 상태로 시작한다.
// 목 BE의 /auth/me가 무조건 응답하므로 토큰 값은 임의 문자열이어도 된다.
export async function loginAs(context: BrowserContext): Promise<void> {
  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: "e2e-token",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
