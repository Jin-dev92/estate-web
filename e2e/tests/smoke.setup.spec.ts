import { test, expect } from "@playwright/test";

// 인프라(webServer 2종·Next 기동) 동작 확인용. Task 3에서 실제 스모크로 대체/삭제.
test("앱이 뜨고 로그인 페이지가 렌더된다", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "로그인", exact: true })).toBeVisible();
});
