import { test, expect } from "@playwright/test";
import { loginWithExpiredAccess, loginWithDeadRefresh } from "../fixtures/auth";
import { PAGE_ROUTES, SESSION_COOKIE, REFRESH_COOKIE } from "../../lib/constants";
import { E2E_REFRESH } from "../fixtures/e2e-constants";

test.describe("액세스 토큰 자동 갱신", () => {
  test("액세스 쿠키가 만료돼도 리프레시 쿠키가 살아있으면 대시보드가 그대로 열린다", async ({
    context,
    page,
  }) => {
    // 이게 깨지면 사용자는 15분마다 로그인 화면을 보게 된다 — 가장 눈에 띄는 회귀다.
    await loginWithExpiredAccess(context);

    await page.goto(PAGE_ROUTES.dashboard);

    await expect(page).toHaveURL(new RegExp(`${PAGE_ROUTES.dashboard}$`));
    await expect(page.getByRole("heading", { name: "내 계약" })).toBeVisible();
  });

  test("갱신된 토큰 쌍이 쿠키에 교체 저장된다", async ({ context, page }) => {
    // 리프레시 토큰은 회전한다. 옛 값을 남기면 다음 갱신에서 소비된 토큰을
    // 제출해 BE가 세션 가족을 폐기하고 사용자가 전 기기에서 로그아웃된다.
    await loginWithExpiredAccess(context);

    await page.goto(PAGE_ROUTES.dashboard);
    await expect(page).toHaveURL(new RegExp(`${PAGE_ROUTES.dashboard}$`));

    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === SESSION_COOKIE)?.value).toBe(
      E2E_REFRESH.rotatedAccessToken,
    );
    expect(cookies.find((c) => c.name === REFRESH_COOKIE)?.value).toBe(
      E2E_REFRESH.rotatedRefreshToken,
    );
  });

  test("리프레시 토큰까지 죽으면 로그인 화면으로 보낸다", async ({ context, page }) => {
    await loginWithDeadRefresh(context);

    await page.goto(PAGE_ROUTES.dashboard);

    await expect(page).toHaveURL(new RegExp(`${PAGE_ROUTES.login}$`));
  });

  test("죽은 세션의 쿠키는 정리된다", async ({ context, page }) => {
    // 남겨두면 매 요청마다 갱신을 시도해 401을 반복한다.
    await loginWithDeadRefresh(context);

    await page.goto(PAGE_ROUTES.dashboard);
    await expect(page).toHaveURL(new RegExp(`${PAGE_ROUTES.login}$`));

    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === REFRESH_COOKIE)?.value).toBeFalsy();
  });
});
