import { test, expect } from "@playwright/test";
import { MESSAGES } from "../../lib/messages";
import { API_ROUTES } from "../../lib/constants";
import { loginAs } from "../fixtures/auth";
import { E2E_BOARD } from "../fixtures/e2e-constants";

// prefill 픽스처로 인증 상태에서 시작 — 건물 보드로 직행한다.
test("건물 게시판 목록이 렌더된다", async ({ page, context }) => {
  await loginAs(context);
  await page.goto(`/board/${E2E_BOARD.buildingId}`);

  await expect(page.getByRole("heading", { name: "건물 게시판" })).toBeVisible();
  await expect(page.getByText(E2E_BOARD.postTitle)).toBeVisible();
  // 글쓰기 폼이 존재한다(제목 필드).
  await expect(page.getByLabel("제목")).toBeVisible();
});

test("목록에서 글을 열면 상세로 이동한다", async ({ page, context }) => {
  await loginAs(context);
  await page.goto(`/board/${E2E_BOARD.buildingId}`);

  await page.getByText(E2E_BOARD.postTitle).click();

  await expect(page).toHaveURL(new RegExp(`/board/${E2E_BOARD.buildingId}/${E2E_BOARD.postId}$`));
  await expect(page.getByText(E2E_BOARD.postBody)).toBeVisible();
  await expect(page.getByPlaceholder("댓글을 입력하세요")).toBeVisible();
});

test("글을 작성하면 에러 없이 저장된다(성공경로)", async ({ page, context }) => {
  await loginAs(context);
  await page.goto(`/board/${E2E_BOARD.buildingId}`);

  await page.getByLabel("제목").fill("새 글 제목");
  await page.getByLabel("내용").fill("새 글 내용");
  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(API_ROUTES.buildingPosts(E2E_BOARD.buildingId)) && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "글 등록" }).click(),
  ]);
  expect(res.ok()).toBe(true);
  await expect(page.getByText(MESSAGES.board.createFailed)).not.toBeVisible();
});

test("댓글을 작성하면 에러 없이 저장된다(성공경로)", async ({ page, context }) => {
  await loginAs(context);
  await page.goto(`/board/${E2E_BOARD.buildingId}/${E2E_BOARD.postId}`);

  await page.getByPlaceholder("댓글을 입력하세요").fill("새 댓글");
  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(API_ROUTES.postComments(E2E_BOARD.postId)) && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "댓글 등록" }).click(),
  ]);
  expect(res.ok()).toBe(true);
  await expect(page.getByText(MESSAGES.comment.createFailed)).not.toBeVisible();
});
