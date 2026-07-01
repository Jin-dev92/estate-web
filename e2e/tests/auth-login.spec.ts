import { test, expect } from "@playwright/test";
import { MESSAGES } from "../../lib/messages";
import { E2E_CREDENTIALS } from "../fixtures/e2e-constants";

// Spec-as-Code: 읽으면 "로그인하면 대시보드로 간다"는 명세, 돌리면 검증.
test("정상 로그인 시 대시보드로 이동한다", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(E2E_CREDENTIALS.tenantEmail);
  await page.getByLabel("비밀번호").fill(E2E_CREDENTIALS.password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  // 인증 영역 헤더(터전)와 TENANT 대시보드 제목으로 도달 확인.
  await expect(page.getByText("터전")).toBeVisible();
  await expect(page.getByRole("heading", { name: "내 계약" })).toBeVisible();
});

test("잘못된 자격이면 에러 메시지를 보이고 로그인에 머문다", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(E2E_CREDENTIALS.failEmail);
  await page.getByLabel("비밀번호").fill("wrongpass");
  await page.getByRole("button", { name: "로그인", exact: true }).click();

  await expect(page.getByText(MESSAGES.auth.invalidCredentials)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
