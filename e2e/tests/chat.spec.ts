import { test, expect } from "@playwright/test";
import { MESSAGES } from "../../lib/messages";
import { PAGE_ROUTES } from "../../lib/constants";
import { loginAs, loginAsOwner } from "../fixtures/auth";
import { E2E_CHAT, E2E_BUILDING } from "../fixtures/e2e-constants";

// 1:1 실시간 채팅 happy-path. 목 WS(:3098)가 보낸 메시지를 에코한다.
// prefill 픽스처로 인증 상태에서 방으로 직행한다.

test("방에 연결되면 메시지를 보내고 에코를 받는다", async ({ page, context }) => {
  await loginAs(context);
  await page.goto(PAGE_ROUTES.chatRoom(E2E_CHAT.roomId));

  const input = page.getByPlaceholder(MESSAGES.chat.inputPlaceholder);
  const sendButton = page.getByRole("button", { name: "전송" });

  // 입력이 채워진 뒤 전송 버튼이 활성화되면 = socket 연결됨(전송은 connected까지 비활성).
  const content = "E2E 실시간 메시지";
  await input.fill(content);
  await expect(sendButton).toBeEnabled();

  // 전송 → 목 WS 에코 → 메시지 버블이 목록에 나타난다.
  await sendButton.click();
  await expect(page.getByText(content)).toBeVisible();

  // 미연결 안내는 노출되지 않는다.
  await expect(page.getByText(MESSAGES.chat.disconnected)).toBeHidden();
});

// 방 목록 렌더 + 방 진입. OWNER 세션이면 라벨 건물명이 /buildings 목에서 매핑된다.
test("채팅 목록에서 방을 열면 대화방으로 이동한다", async ({ page, context }) => {
  await loginAsOwner(context);
  await page.goto(PAGE_ROUTES.chat);

  await expect(page.getByRole("heading", { name: "채팅" })).toBeVisible();
  const label = `${E2E_BUILDING.name} · 입주자`;
  await expect(page.getByText(label)).toBeVisible();

  await page.getByText(label).click();
  await expect(page).toHaveURL(new RegExp(`${PAGE_ROUTES.chatRoom(E2E_CHAT.roomId)}$`));
});
