import type { Page } from "@playwright/test";
import { KAKAO_STATE_KEY, PAGE_ROUTES } from "../../lib/constants";

// 카카오 콜백 페이지는 sessionStorage의 state와 URL의 state를 대조해 CSRF를 가드한다.
// 외부(kauth.kakao.com) 리다이렉트는 우리 코드가 아니므로 콜백 페이지부터 시작하고,
// 진입 전 sessionStorage를 직접 심어 재현한다(스펙 범위 결정: docs/test/e2e-kakao-spec.md).
export async function gotoKakaoCallback(
  page: Page,
  opts: { code: string; urlState: string; seededState: string | null },
): Promise<void> {
  await page.goto(PAGE_ROUTES.login);
  await page.evaluate(
    ({ key, value }) => {
      if (value === null) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, value);
    },
    { key: KAKAO_STATE_KEY, value: opts.seededState },
  );
  await page.goto(
    `${PAGE_ROUTES.kakaoCallback}?code=${encodeURIComponent(opts.code)}&state=${encodeURIComponent(opts.urlState)}`,
  );
}
