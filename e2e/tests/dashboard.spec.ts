import { test, expect } from "@playwright/test";
import { PAGE_ROUTES } from "../../lib/constants";
import { loginAs, loginAsOwner } from "../fixtures/auth";
import { E2E_BUILDING } from "../fixtures/e2e-constants";

// 대시보드 홈 렌더 스모크(FE-M1) — 로그인 후 모든 유저가 밟는 최다빈도 화면.
// 역할은 주입한 세션 토큰으로 목 /auth/me가 분기한다.

test("TENANT는 대시보드에서 '내 계약' 홈을 본다", async ({ page, context }) => {
  await loginAs(context);
  await page.goto(PAGE_ROUTES.dashboard);

  await expect(page.getByRole("heading", { name: "내 계약" })).toBeVisible();
});

test("OWNER는 대시보드에서 '내 건물' 홈과 보유 건물을 본다", async ({ page, context }) => {
  await loginAsOwner(context);
  await page.goto(PAGE_ROUTES.dashboard);

  await expect(page.getByRole("heading", { name: "내 건물" })).toBeVisible();
  await expect(page.getByText("보유 건물")).toBeVisible();
  await expect(page.getByText(E2E_BUILDING.name)).toBeVisible();
});
