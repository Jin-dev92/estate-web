import { test, expect } from "@playwright/test";
import { MESSAGES } from "../../lib/messages";
import { ROLE_LABEL, API_ROUTES } from "../../lib/constants";
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

test("이름을 수정하면 재조회에 반영된다(영속성)", async ({ page, context }) => {
  await loginAs(context);
  await page.goto("/settings");

  // 유니크 이름 — 토큰 스코프라 테스트별 격리. 서버 저장 후 리로드 재조회로 영속 검증.
  const name = `박수정-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await page.getByLabel(MESSAGES.settings.name).fill(name);
  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(API_ROUTES.profile) && r.request().method() === "PATCH",
    ),
    page.getByRole("button", { name: MESSAGES.settings.saveName }).click(),
  ]);
  expect(res.ok()).toBe(true);

  // 리로드 = 서버 상태로부터 새로 렌더(타이핑 값이 아니라 저장된 값). 수정한 이름이 프리필된다.
  await page.reload();
  // reload+SSR은 CI webkit에서 느려 전역 10s보다 여유를 준다.
  await expect(page.getByLabel(MESSAGES.settings.name)).toHaveValue(name, { timeout: 20_000 });
});

test("비밀번호를 변경하면 로그인 화면으로 이동한다(성공경로)", async ({ page, context }) => {
  await loginAs(context);
  await page.goto("/settings");

  await page.getByLabel(MESSAGES.settings.currentPassword).fill(E2E_CREDENTIALS.password);
  await page.getByLabel(MESSAGES.settings.newPassword).fill("newpassword123");
  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(API_ROUTES.profilePassword) && r.request().method() === "PATCH",
    ),
    page.getByRole("button", { name: MESSAGES.settings.changePassword }).click(),
  ]);
  expect(res.ok()).toBe(true);

  // BE가 비밀번호 변경 성공 시 본인 포함 전체 세션을 폐기한다 — FE는 로그인 화면으로 보낸다.
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: MESSAGES.auth.login, exact: true })).toBeVisible();
});

test("현재 비밀번호가 틀리면 에러를 보인다", async ({ page, context }) => {
  await loginAs(context);
  await page.goto("/settings");

  await page.getByLabel(MESSAGES.settings.currentPassword).fill(E2E_CREDENTIALS.wrongPassword);
  await page.getByLabel(MESSAGES.settings.newPassword).fill("newpassword123");
  await page.getByRole("button", { name: MESSAGES.settings.changePassword }).click();

  await expect(page.getByText(MESSAGES.settings.wrongCurrentPassword)).toBeVisible();
});

test("비밀번호 폼은 현재 비밀번호가 비면 검증 에러를 보이고 요청하지 않는다", async ({ page, context }) => {
  await loginAs(context);
  await page.goto("/settings");

  // 새 비번만 채우고 현재 비번은 비운 채 제출 → 클라 검증(현재 비번 필수)이 막는다.
  await page.getByLabel(MESSAGES.settings.newPassword).fill("newpassword123");
  await page.getByRole("button", { name: MESSAGES.settings.changePassword }).click();

  // 위 검증 에러 단언이 "RHF가 제출을 막았다"를 이미 확인한다.
  // 성공 문구 부재를 덧붙이던 단언은 성공 시 로그인으로 이동하게 바뀐 뒤
  // 렌더될 일이 없어져 자명하게 참이 됐으므로 제거했다.
});

test("로그아웃하면 로그인 페이지로 이동한다", async ({ page, context }) => {
  await loginAs(context);
  await page.goto("/settings");

  await page.getByRole("button", { name: MESSAGES.settings.logout }).click();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: MESSAGES.auth.login, exact: true })).toBeVisible();
});
