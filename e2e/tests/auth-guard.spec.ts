// seed: e2e/tests/seed.spec.ts
import { test, expect } from "@playwright/test";
import { PAGE_ROUTES } from "../../lib/constants";
import { loginAs } from "../fixtures/auth";

test.describe("인증 가드", () => {
  test("미인증 상태로 대시보드 접근 시 로그인 페이지로 리다이렉트", async ({ page }) => {
    // 1. 로그인하지 않은 상태에서 PAGE_ROUTES.dashboard(/dashboard)로 이동한다
    await page.goto(PAGE_ROUTES.dashboard);

    await expect(page).toHaveURL(new RegExp(PAGE_ROUTES.login));
    await expect(page.getByRole("heading", { name: "로그인" })).toBeVisible();
  });

  test("인증 상태로 로그인 페이지 접근 시 대시보드로 리다이렉트", async ({ page, context }) => {
    // 1. loginAs(context)로 세션 쿠키를 주입한다
    await loginAs(context);
    // 2. PAGE_ROUTES.login(/login)으로 이동한다
    await page.goto(PAGE_ROUTES.login);

    await expect(page).toHaveURL(new RegExp(PAGE_ROUTES.dashboard));
    await expect(page.getByRole("heading", { name: "내 계약" })).toBeVisible();
  });

  test("인증 상태로 회원가입 페이지 접근 시 대시보드로 리다이렉트", async ({ page, context }) => {
    // 1. loginAs(context)로 세션 쿠키를 주입한다
    await loginAs(context);
    // 2. PAGE_ROUTES.signup(/signup)으로 이동한다
    await page.goto(PAGE_ROUTES.signup);

    await expect(page).toHaveURL(new RegExp(PAGE_ROUTES.dashboard));
    await expect(page.getByRole("heading", { name: "내 계약" })).toBeVisible();
  });
});
