// seed: e2e/tests/seed.spec.ts
import { test, expect } from "@playwright/test";
import { PAGE_ROUTES, ROLE, ROLE_LABEL } from "../../lib/constants";
import { MESSAGES } from "../../lib/messages";
import { loginAsOwner } from "../fixtures/auth";
import { E2E_CHAT, E2E_BUILDING } from "../fixtures/e2e-constants";

// 목 BE의 room-e2e는 buildingId가 E2E_BUILDING.id인 방이다(mock-data.ts mockChatRoom 참고).
// 헤더 제목은 lib/chat/room-label.ts의 조합 규칙("건물명 · 상대 역할")을 따른다.
// OWNER로 로그인했으므로 상대는 TENANT → ROLE_LABEL[ROLE.TENANT]("입주자").
const roomTitle = `${E2E_BUILDING.name} · ${ROLE_LABEL[ROLE.TENANT]}`;

test.describe("채팅방 헤더", () => {
  test("채팅방에 들어가면 어느 건물의 누구와 하는 대화인지 보인다", async ({ page, context }) => {
    await loginAsOwner(context);
    await page.goto(PAGE_ROUTES.chatRoom(E2E_CHAT.roomId));

    await expect(page.getByRole("heading", { name: roomTitle })).toBeVisible();
  });

  test("채팅방에서 목록으로 돌아갈 수 있다", async ({ page, context }) => {
    await loginAsOwner(context);
    await page.goto(PAGE_ROUTES.chatRoom(E2E_CHAT.roomId));

    await page.getByRole("link", { name: MESSAGES.chat.backToList }).click();

    await expect(page).toHaveURL(new RegExp(`${PAGE_ROUTES.chat}$`));
  });
});
