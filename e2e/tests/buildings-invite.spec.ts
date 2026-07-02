import { test, expect } from "@playwright/test";
import { API_ROUTES, PAGE_ROUTES } from "../../lib/constants";
import { loginAs } from "../fixtures/auth";
import { E2E_BUILDING } from "../fixtures/e2e-constants";

// OWNER 건물·호실·초대코드 발급 플로우. prefill 픽스처로 인증 상태에서 시작한다.

test("건물 목록에서 상세로 이동하면 호실이 보인다", async ({ page, context }) => {
  await loginAs(context);
  await page.goto(PAGE_ROUTES.buildings);

  await expect(page.getByRole("heading", { name: "건물 관리" })).toBeVisible();
  await page.getByRole("link", { name: E2E_BUILDING.name }).click();

  await expect(page).toHaveURL(new RegExp(`${PAGE_ROUTES.buildingDetail(E2E_BUILDING.id)}$`));
  await expect(page.getByRole("heading", { name: "호실 관리" })).toBeVisible();
  await expect(page.getByText(E2E_BUILDING.unitName)).toBeVisible();
});

test("호실에서 초대코드를 발급하면 코드가 노출된다", async ({ page, context }) => {
  await loginAs(context);
  await page.goto(PAGE_ROUTES.buildingDetail(E2E_BUILDING.id));

  // 호실이 렌더된 뒤 발급 버튼을 누른다.
  await expect(page.getByText(E2E_BUILDING.unitName)).toBeVisible();
  const [res] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes(API_ROUTES.unitInviteCodes(E2E_BUILDING.unitId)) &&
        r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "초대코드 발급" }).click(),
  ]);
  expect(res.ok()).toBe(true);

  // 발급된 코드와 복사 액션이 노출된다.
  await expect(page.getByText(E2E_BUILDING.issuedCode)).toBeVisible();
  await expect(page.getByRole("button", { name: "코드 복사" })).toBeVisible();
});
