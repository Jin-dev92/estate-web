import { test, expect } from "@playwright/test";
import { MESSAGES } from "../../lib/messages";
import { API_ROUTES, PAGE_ROUTES } from "../../lib/constants";
import { E2E_SIGNUP, E2E_INVITE } from "../fixtures/e2e-constants";

// 미인증 온보딩 플로우 — 세션 픽스처 없이 가입 화면에서 시작한다.

test("건물주로 가입하면 대시보드로 이동한다", async ({ page }) => {
  await page.goto(PAGE_ROUTES.signup);
  await page.getByRole("link", { name: "건물주로 시작" }).click();

  await expect(page.getByRole("heading", { name: "건물주 회원가입" })).toBeVisible();
  await page.getByLabel("이름").fill(E2E_SIGNUP.ownerName);
  await page.getByLabel("이메일").fill(E2E_SIGNUP.ownerEmail);
  await page.getByLabel("비밀번호").fill(E2E_SIGNUP.password);

  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(API_ROUTES.signup) && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "가입하고 시작하기" }).click(),
  ]);
  expect(res.ok()).toBe(true);
  await expect(page).toHaveURL(/\/dashboard/);
});

test("입주자는 유효한 초대코드로 미리보기 후 가입해 입주를 완료한다", async ({ page }) => {
  await page.goto(PAGE_ROUTES.signup);
  await page.getByRole("link", { name: "입주자로 시작" }).click();

  // 1) 초대코드 입력 → 미리보기.
  await expect(page.getByRole("heading", { name: "초대코드 입력" })).toBeVisible();
  await page.getByLabel("초대코드").fill(E2E_INVITE.validCode);
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(API_ROUTES.invitePreview) && r.request().method() === "GET",
    ),
    page.getByRole("button", { name: "다음" }).click(),
  ]);

  // 2) 미리보기의 건물/호실이 계정 단계에 노출된다.
  await expect(page.getByRole("heading", { name: "계정 만들기" })).toBeVisible();
  await expect(
    page.getByText(`${E2E_INVITE.buildingName} ${E2E_INVITE.unitName}`, { exact: true }),
  ).toBeVisible();

  // 3) 계정 입력 → 가입+입주(redeem).
  await page.getByLabel("이름").fill(E2E_SIGNUP.tenantName);
  await page.getByLabel("이메일").fill(E2E_SIGNUP.tenantEmail);
  await page.getByLabel("비밀번호").fill(E2E_SIGNUP.password);
  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(API_ROUTES.signup) && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "가입하고 입주하기" }).click(),
  ]);
  expect(res.ok()).toBe(true);

  // 4) 입주 완료 화면 → 홈으로 이동.
  await expect(
    page.getByText(`${E2E_INVITE.buildingName} ${E2E_INVITE.unitName} 입주 완료!`),
  ).toBeVisible();
  await page.getByRole("button", { name: "홈으로" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test("유효하지 않은 초대코드는 에러를 보이고 코드 단계에 머문다", async ({ page }) => {
  await page.goto(PAGE_ROUTES.signup);
  await page.getByRole("link", { name: "입주자로 시작" }).click();

  await page.getByLabel("초대코드").fill(E2E_INVITE.invalidCode);
  await page.getByRole("button", { name: "다음" }).click();

  await expect(page.getByText(MESSAGES.invite.invalid)).toBeVisible();
  await expect(page.getByRole("heading", { name: "초대코드 입력" })).toBeVisible();
});
