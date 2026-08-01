import { test, expect } from "@playwright/test";
import { MESSAGES } from "../../lib/messages";
import { E2E_KAKAO, E2E_REFRESH } from "../fixtures/e2e-constants";
import { gotoKakaoCallback } from "../fixtures/kakao";
import { REFRESH_COOKIE } from "../../lib/constants";

test("기존 카카오 연동 계정으로 콜백에 진입하면 대시보드로 이동한다", async ({ page, context }) => {
  await gotoKakaoCallback(page, {
    code: E2E_KAKAO.existingCode,
    urlState: "state-existing",
    seededState: "state-existing",
  });

  await expect(page).toHaveURL(/\/dashboard/);
  // 헤더 로고 링크로 특정한다. getByText("터전")은 대시보드의 계약 카드
  // ("터전오너빌딩 201호")까지 잡아 strict mode violation이 난다.
  await expect(page.getByRole("link", { name: "터 터전" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "내 계약" })).toBeVisible();

  // 카카오 로그인도 리프레시 쿠키를 심어야 15분 뒤 자동 갱신이 가능하다.
  const cookies = await context.cookies();
  expect(cookies.find((c) => c.name === REFRESH_COOKIE)?.value).toBe(E2E_REFRESH.validToken);
});

test("신규 카카오 사용자는 역할 선택 후 대시보드로 이동한다", async ({ page }) => {
  await gotoKakaoCallback(page, {
    code: E2E_KAKAO.newCode,
    urlState: "state-new",
    seededState: "state-new",
  });

  await expect(page).toHaveURL(/\/signup\/role-select/);
  await expect(page.getByRole("heading", { name: "역할 선택" })).toBeVisible();

  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/auth/kakao/complete") && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "건물주" }).click(),
  ]);
  expect(res.ok()).toBe(true);
  await expect(page).toHaveURL(/\/dashboard/);
});

test("state가 일치하지 않으면 에러를 보이고 콜백 페이지에 머무른다", async ({ page }) => {
  await gotoKakaoCallback(page, {
    code: E2E_KAKAO.existingCode,
    urlState: "state-mismatch-url",
    seededState: "state-mismatch-seeded",
  });

  await expect(page.getByText(MESSAGES.auth.kakaoFailed)).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/kakao\/callback/);
});

test("BE가 400을 반환하면 콜백에 에러 메시지를 보인다", async ({ page }) => {
  await gotoKakaoCallback(page, {
    code: E2E_KAKAO.errorCode,
    urlState: "state-error",
    seededState: "state-error",
  });

  await expect(page.getByText(MESSAGES.auth.kakaoEmailRequired)).toBeVisible();
});
