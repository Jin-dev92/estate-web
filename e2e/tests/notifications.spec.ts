import { test, expect } from "@playwright/test";
import { MESSAGES } from "../../lib/messages";
import { API_ROUTES, PAGE_ROUTES } from "../../lib/constants";
import { loginAs } from "../fixtures/auth";
import { E2E_NOTIFICATION, E2E_BOARD } from "../fixtures/e2e-constants";

// prefill 픽스처로 인증 상태에서 시작 — 알림 센터로 직행한다.
test("알림 목록이 미읽음·읽음 항목과 함께 렌더된다", async ({ page, context }) => {
  await loginAs(context);
  await page.goto(PAGE_ROUTES.notifications);

  await expect(page.getByRole("heading", { name: "알림" })).toBeVisible();
  // exact: 본문("…댓글이 달렸어요.")이 제목을 부분 포함하므로 제목만 정확히 매칭한다.
  await expect(page.getByText(E2E_NOTIFICATION.unreadTitle, { exact: true })).toBeVisible();
  await expect(page.getByText(E2E_NOTIFICATION.readTitle, { exact: true })).toBeVisible();
  // 전체 읽음 액션이 존재한다.
  await expect(page.getByRole("button", { name: MESSAGES.notification.markAll })).toBeVisible();
});

test("미읽음 알림을 열면 읽음 처리되고 딥링크로 이동한다", async ({ page, context }) => {
  await loginAs(context);
  await page.goto(PAGE_ROUTES.notifications);

  const [res] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes(API_ROUTES.notificationRead(E2E_NOTIFICATION.unreadId)) &&
        r.request().method() === "PATCH",
    ),
    page.getByText(E2E_NOTIFICATION.unreadTitle, { exact: true }).click(),
  ]);
  expect(res.ok()).toBe(true);

  // PostAdded + buildingId → 게시글 상세로 딥링크.
  await expect(page).toHaveURL(
    new RegExp(`${PAGE_ROUTES.boardPost(E2E_BOARD.buildingId, E2E_BOARD.postId)}$`),
  );
});

test("모두 읽음을 누르면 전체 읽음이 처리된다(성공경로)", async ({ page, context }) => {
  await loginAs(context);
  await page.goto(PAGE_ROUTES.notifications);

  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(API_ROUTES.notificationsRead) && r.request().method() === "PATCH",
    ),
    page.getByRole("button", { name: MESSAGES.notification.markAll }).click(),
  ]);
  expect(res.ok()).toBe(true);
  await expect(page.getByText(MESSAGES.notification.markFailed)).not.toBeVisible();
});
