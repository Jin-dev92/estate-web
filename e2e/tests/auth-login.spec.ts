import { test, expect } from "@playwright/test";
import { MESSAGES } from "../../lib/messages";
import { E2E_CREDENTIALS, E2E_REFRESH } from "../fixtures/e2e-constants";
import { REFRESH_COOKIE } from "../../lib/constants";

// Spec-as-Code: 읽으면 "로그인하면 대시보드로 간다"는 명세, 돌리면 검증.
test("정상 로그인 시 대시보드로 이동한다", async ({ page, context }) => {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(E2E_CREDENTIALS.tenantEmail);
  await page.getByLabel("비밀번호").fill(E2E_CREDENTIALS.password);
  await page.getByRole("button", { name: MESSAGES.auth.login, exact: true }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  // 인증 영역 헤더(터전)와 TENANT 대시보드 제목으로 도달 확인.
  // 헤더 로고 링크로 특정한다. getByText("터전")은 대시보드의 계약 카드
  // ("터전오너빌딩 201호")까지 잡아 strict mode violation이 난다.
  await expect(page.getByRole("link", { name: "터 터전" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "내 계약" })).toBeVisible();

  // 로그인이 리프레시 쿠키까지 심어야 15분 뒤 자동 갱신이 가능하다.
  // 이 단언이 없으면 로그인 라우트가 액세스 토큰만 저장하도록 회귀해도
  // 모든 검증이 통과하고, 사용자만 15분 뒤 조용히 로그아웃된다.
  const cookies = await context.cookies();
  expect(cookies.find((c) => c.name === REFRESH_COOKIE)?.value).toBe(E2E_REFRESH.validToken);
});

test("잘못된 자격이면 에러 메시지를 보이고 로그인에 머문다", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(E2E_CREDENTIALS.failEmail);
  await page.getByLabel("비밀번호").fill("wrongpass");
  await page.getByRole("button", { name: MESSAGES.auth.login, exact: true }).click();

  await expect(page.getByText(MESSAGES.auth.invalidCredentials)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
