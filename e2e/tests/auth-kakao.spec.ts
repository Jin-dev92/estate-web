import { test, expect } from "@playwright/test";
import { PAGE_ROUTES } from "../../lib/constants";
import { E2E_KAKAO } from "../fixtures/e2e-constants";
import { gotoKakaoCallback } from "../fixtures/kakao";

test("기존 카카오 연동 계정으로 콜백에 진입하면 대시보드로 이동한다", async ({ page }) => {
  await gotoKakaoCallback(page, {
    code: E2E_KAKAO.existingCode,
    urlState: "state-existing",
    seededState: "state-existing",
  });

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("터전")).toBeVisible();
  await expect(page.getByRole("heading", { name: "내 계약" })).toBeVisible();
});
