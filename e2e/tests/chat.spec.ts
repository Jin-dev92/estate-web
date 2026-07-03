import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { MESSAGES } from "../../lib/messages";
import { PAGE_ROUTES, API_ROUTES } from "../../lib/constants";
import { loginAs, loginAsOwner, loginAsWsConnectError } from "../fixtures/auth";
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
  // 소켓 연결 대기 — CI webkit에서 socket.io 핸드셰이크가 느려 전역 10s보다 여유를 준다.
  await expect(sendButton).toBeEnabled({ timeout: 15_000 });

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

// A1: 비참가자 방 진입 → 목 WS가 CHAT_NOT_ROOM_PARTICIPANT emit → 에러 안내.
test("비참가자 방에 들어가면 참가자 아님 안내를 본다", async ({ page, context }) => {
  await loginAs(context);
  await page.goto(PAGE_ROUTES.chatRoom(E2E_CHAT.forbiddenRoomId));

  await expect(page.getByText(MESSAGES.chat.notParticipant)).toBeVisible();
});

// A2: TENANT는 채팅이 없으면(빈 목록) 활성 리스 건물주에게 문의를 시작해 방으로 이동.
test("입주자는 채팅이 없을 때 건물주에게 문의를 시작해 방으로 이동한다", async ({ page, context }) => {
  await loginAs(context);
  await page.goto(PAGE_ROUTES.chat);

  const start = page.getByRole("button", { name: MESSAGES.chat.startOwner });
  await expect(start).toBeVisible();

  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(API_ROUTES.chatRooms) && r.request().method() === "POST",
    ),
    start.click(),
  ]);
  await expect(page).toHaveURL(new RegExp(`${PAGE_ROUTES.chatRoom(E2E_CHAT.roomId)}$`));
});

// C1: 전용 토큰으로 접속하면 목 WS가 핸드셰이크 단계에서 연결을 거부한다.
test("연결이 거부되면 연결 실패 안내를 본다", async ({ page, context }) => {
  await loginAsWsConnectError(context);
  await page.goto(PAGE_ROUTES.chatRoom(E2E_CHAT.roomId));

  await expect(page.getByText(MESSAGES.chat.connectFailed)).toBeVisible();
});

// C2: 서버가 강제로 끊어도 socket.io-client 기본 자동 재연결로 복구되고, 재연결 후 정상 송수신된다.
test("연결이 끊겼다가 자동으로 재연결되면 다시 메시지를 주고받을 수 있다", async ({ page, context }) => {
  await loginAs(context);
  await page.goto(PAGE_ROUTES.chatRoom(E2E_CHAT.reconnectRoomId));

  const input = page.getByPlaceholder(MESSAGES.chat.inputPlaceholder);
  const sendButton = page.getByRole("button", { name: "전송" });

  // 이 방은 목 WS가 최초 입장 시 토큰당 1회 강제로 연결을 끊는다 — 끊김 안내가 뜬다.
  await expect(page.getByText(MESSAGES.chat.disconnected)).toBeVisible({ timeout: 15_000 });

  // 자동 재연결되면 끊김 안내가 사라지고 전송버튼이 다시 활성화된다.
  await expect(page.getByText(MESSAGES.chat.disconnected)).toBeHidden({ timeout: 15_000 });
  await input.fill("재연결 후 메시지");
  await expect(sendButton).toBeEnabled({ timeout: 15_000 });

  // 재연결 후에도 정상적으로 보내고 에코를 받는다.
  await sendButton.click();
  await expect(page.getByText("재연결 후 메시지")).toBeVisible();
});

// C3: 두 사람(TENANT/OWNER)이 같은 방에 들어가 서로가 보낸 메시지를 받는다.
// 3브라우저 병렬 실행이 서로 섞이지 않도록 테스트마다 랜덤 방 ID를 쓴다.
test("상대방이 보낸 메시지를 받는다", async ({ browser }) => {
  const roomId = `room-multiuser-${randomUUID()}`;

  const tenantContext = await browser.newContext();
  const ownerContext = await browser.newContext();
  await loginAs(tenantContext);
  await loginAsOwner(ownerContext);

  const tenantPage = await tenantContext.newPage();
  const ownerPage = await ownerContext.newPage();

  await tenantPage.goto(PAGE_ROUTES.chatRoom(roomId));
  await ownerPage.goto(PAGE_ROUTES.chatRoom(roomId));

  const tenantInput = tenantPage.getByPlaceholder(MESSAGES.chat.inputPlaceholder);
  const tenantSend = tenantPage.getByRole("button", { name: "전송" });
  const ownerInput = ownerPage.getByPlaceholder(MESSAGES.chat.inputPlaceholder);
  const ownerSend = ownerPage.getByRole("button", { name: "전송" });

  // 입력이 채워진 뒤 전송 버튼이 활성화되면 = socket 연결됨(전송은 connected까지 비활성).
  const fromTenant = "TENANT가 보낸 메시지";
  await tenantInput.fill(fromTenant);
  await expect(tenantSend).toBeEnabled({ timeout: 15_000 });

  const fromOwner = "OWNER가 보낸 메시지";
  await ownerInput.fill(fromOwner);
  await expect(ownerSend).toBeEnabled({ timeout: 15_000 });

  await tenantSend.click();
  await expect(ownerPage.getByText(fromTenant)).toBeVisible();

  await ownerSend.click();
  await expect(tenantPage.getByText(fromOwner)).toBeVisible();

  await tenantContext.close();
  await ownerContext.close();
});
