import { test, expect } from "@playwright/test";
import { MESSAGES } from "../../lib/messages";
import { ROLE_LABEL } from "../../lib/constants";
import { loginAs } from "../fixtures/auth";
import { E2E_CREDENTIALS } from "../fixtures/e2e-constants";

// prefill 픽스처로 인증 상태에서 시작 — 로그인 UI를 거치지 않는다(하네스 스펙 §6).
test("인증 사용자는 설정 페이지에서 프로필을 본다", async ({ page, context }) => {
  await loginAs(context);
  await page.goto("/settings");

  await expect(page.getByText(E2E_CREDENTIALS.tenantEmail)).toBeVisible();
  await expect(page.getByText(ROLE_LABEL.TENANT)).toBeVisible();
  // 이름 필드가 프로필 이름으로 프리필된다.
  await expect(page.getByLabel(MESSAGES.settings.name)).toHaveValue(E2E_CREDENTIALS.tenantName);
});

test("이름을 수정하면 에러 없이 저장된다(성공경로)", async ({ page, context }) => {
  await loginAs(context);
  await page.goto("/settings");

  await page.getByLabel(MESSAGES.settings.name).fill("박수정");
  await page.getByRole("button", { name: MESSAGES.settings.saveName }).click();

  // 성공경로 — 실패 문구가 뜨지 않고 설정 페이지에 머문다(무상태라 영구 반영은 검증 안 함).
  await expect(page.getByText(MESSAGES.settings.updateFailed)).not.toBeVisible();
  await expect(page).toHaveURL(/\/settings/);
});

test("로그아웃하면 로그인 페이지로 이동한다", async ({ page, context }) => {
  await loginAs(context);
  await page.goto("/settings");

  await page.getByRole("button", { name: MESSAGES.settings.logout }).click();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: "로그인", exact: true })).toBeVisible();
});
