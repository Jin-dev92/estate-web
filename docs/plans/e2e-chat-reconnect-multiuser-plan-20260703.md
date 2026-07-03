# 채팅 재연결·connect_error·멀티유저 E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 채팅 E2E의 남은 3개 시나리오(재연결, connect_error, 멀티유저 메시지 수신)를 목 WS 서버 확장만으로 커버한다.

**Architecture:** 앱 코드(`app/`·`components/`·`lib/`)는 변경하지 않는다. `e2e/mock-ws/server.ts`(socket.io 목 서버)에 ①핸드셰이크 단계에서 특정 토큰을 거부하는 `io.use()` 미들웨어, ②특정 방에서 토큰당 1회만 강제 `disconnect`하는 로직, ③실제 `socket.join()` + `io.to(roomId).emit()` 룸 브로드캐스트 + 발신자 토큰 기반 `senderId` 판별을 추가한다. socket.io-client의 기본 자동 재연결을 그대로 활용한다.

**Tech Stack:** TypeScript, Playwright, socket.io(서버)·socket.io-client(앱, 기존), pnpm.

**Spec:** `docs/test/e2e-chat-reconnect-multiuser-spec.md`

## Global Constraints

- `.ts`/`.tsx`만 사용. 신규 `.js`/`.jsx` 금지.
- **앱 코드(`app/`·`components/`·`lib/`) 변경 금지** — `e2e/` 디렉터리와 `README.md`만 수정한다.
- E2E 셀렉터는 시멘틱만(`getByRole`/`getByLabel`/`getByText`/`getByPlaceholder`). CSS 클래스·DOM 구조 셀렉터 금지("내 메시지 아님" 스타일은 상대방 페이지에서 메시지 텍스트가 보이는지로 검증하고, 배경색 클래스는 검사하지 않는다).
- 하드 대기(`waitForTimeout`) 금지 — `expect`의 auto-wait만 사용.
- 목 BE·목 WS와 테스트가 공유하는 식별자는 `e2e/fixtures/e2e-constants.ts`에 단일 출처로 둔다.
- 각 태스크 작성 직후 해당 시나리오만 먼저 실행해 확인하고, 마지막 태스크에서 `pnpm e2e:burn`으로 전체 flaky 확인 + `pnpm e2e`로 기존 스위트 회귀 확인.
- `pnpm e2e`는 자체 Next 서버·목 BE·목 WS를 모두 빌드·기동한다 — 별도로 `next dev`나 `pnpm e2e:mock-ws`를 미리 띄워 두지 않는다.

---

### Task 1: connect_error — 전용 토큰 거부 미들웨어

**Files:**
- Modify: `e2e/fixtures/e2e-constants.ts` (`E2E_CHAT` 블록, 60번째 줄 근처)
- Modify: `e2e/fixtures/auth.ts`
- Modify: `e2e/mock-ws/server.ts`
- Modify: `e2e/tests/chat.spec.ts`

**Interfaces:**
- Produces: `E2E_CHAT.wsConnectErrorTokenBase: string`
- Produces: `loginAsWsConnectError(context: BrowserContext): Promise<void>` (`e2e/fixtures/auth.ts`) — 이후 태스크에서는 쓰지 않지만, 이 태스크의 테스트가 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

`e2e/tests/chat.spec.ts` 상단 import 수정(`loginAs, loginAsOwner` 옆에 `loginAsWsConnectError` 추가):

```ts
import { loginAs, loginAsOwner, loginAsWsConnectError } from "../fixtures/auth";
```

파일 끝에 테스트 추가:

```ts
// C1: 전용 토큰으로 접속하면 목 WS가 핸드셰이크 단계에서 연결을 거부한다.
test("연결이 거부되면 연결 실패 안내를 본다", async ({ page, context }) => {
  await loginAsWsConnectError(context);
  await page.goto(PAGE_ROUTES.chatRoom(E2E_CHAT.roomId));

  await expect(page.getByText(MESSAGES.chat.connectFailed)).toBeVisible();
});
```

- [ ] **Step 2: 실행해 실패 확인**

Run: `pnpm e2e e2e/tests/chat.spec.ts -g "연결이 거부되면"`
Expected: FAIL — `loginAsWsConnectError`가 없어 타입/빌드 에러, 또는 함수가 없어 import 실패.

- [ ] **Step 3: `E2E_CHAT.wsConnectErrorTokenBase` 추가**

`e2e/fixtures/e2e-constants.ts`의 `E2E_CHAT` 블록을 다음으로 교체:

```ts
// 채팅 E2E 결합 상수(목 BE·목 WS·테스트가 공유).
export const E2E_CHAT = {
  roomId: "room-e2e",
  // 이 방에 join하면 목 WS가 CHAT_NOT_ROOM_PARTICIPANT 에러를 emit한다(비참가자 분기).
  forbiddenRoomId: "room-forbidden-e2e",
  // 이 토큰(prefix)으로 접속하면 목 WS가 핸드셰이크 단계에서 연결을 거부한다(connect_error 분기).
  wsConnectErrorTokenBase: "e2e-ws-connect-error-token",
} as const;
```

- [ ] **Step 4: `loginAsWsConnectError` 헬퍼 추가**

`e2e/fixtures/auth.ts` 상단 import를 다음으로 교체:

```ts
import type { BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { SESSION_COOKIE } from "../../lib/constants";
import { E2E_SESSION_TOKEN, E2E_OWNER_TOKEN, E2E_CHAT } from "./e2e-constants";
```

파일 끝에 함수 추가:

```ts
// connect_error 시나리오 전용 — 이 토큰이면 목 WS(io.use)가 핸드셰이크에서 연결을 거부한다.
export async function loginAsWsConnectError(context: BrowserContext): Promise<void> {
  await injectSession(context, E2E_CHAT.wsConnectErrorTokenBase);
}
```

- [ ] **Step 5: 목 WS에 거부 미들웨어 추가**

`e2e/mock-ws/server.ts`에서 `const io = new Server(httpServer, { cors: { origin: "*" } });` 다음 줄에 추가:

```ts

// 핸드셰이크 단계 인증 게이트. 이 시점엔 아직 roomId를 모르므로(연결 후 join으로 옴)
// token만으로 판단한다. next(new Error(...))를 호출하면 클라이언트에 connect_error가 발생하고
// connect/join은 전혀 일어나지 않는다.
io.use((socket, next) => {
  const token = String(socket.handshake.auth?.token ?? "");
  if (token.startsWith(E2E_CHAT.wsConnectErrorTokenBase)) {
    next(new Error("connect_error"));
    return;
  }
  next();
});
```

- [ ] **Step 6: 실행해 통과 확인**

Run: `pnpm e2e e2e/tests/chat.spec.ts`
Expected: 기존 4개 + 신규 1개 = 5개 테스트 모두 PASS(3브라우저 배수).

- [ ] **Step 7: Commit**

```bash
git add e2e/fixtures/e2e-constants.ts e2e/fixtures/auth.ts e2e/mock-ws/server.ts e2e/tests/chat.spec.ts
git commit -m "test: 채팅 E2E — connect_error 시나리오(전용 토큰 거부)"
```

---

### Task 2: 재연결 — 강제 disconnect + 자동 재연결 확인

**Files:**
- Modify: `e2e/fixtures/e2e-constants.ts` (`E2E_CHAT` 블록)
- Modify: `e2e/mock-ws/server.ts`
- Modify: `e2e/tests/chat.spec.ts`

**Interfaces:**
- Consumes: Task 1의 `io.use` 미들웨어(그대로 둠), `E2E_CHAT` 패턴.
- Produces: `E2E_CHAT.reconnectRoomId: string`. 목 WS 내부에 `disconnectOnceTokens: Set<string>` 모듈 스코프 상태(다른 태스크가 참조하지 않음, 이 태스크 내부 구현 세부사항).

- [ ] **Step 1: 실패하는 테스트 작성**

`e2e/tests/chat.spec.ts` 파일 끝에 추가:

```ts
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
```

- [ ] **Step 2: 실행해 실패 확인**

Run: `pnpm e2e e2e/tests/chat.spec.ts -g "자동으로 재연결"`
Expected: FAIL — `E2E_CHAT.reconnectRoomId`가 `undefined`라 `PAGE_ROUTES.chatRoom(undefined)`로 이동, 목 WS가 끊지 않으므로 "연결이 끊어졌어요…" 문구가 뜨지 않아 첫 번째 `expect(...).toBeVisible()`이 타임아웃.

- [ ] **Step 3: `E2E_CHAT.reconnectRoomId` 추가**

`e2e/fixtures/e2e-constants.ts`의 `E2E_CHAT` 블록에 한 줄 추가(Task 1에서 만든 블록을 이어서 수정):

```ts
export const E2E_CHAT = {
  roomId: "room-e2e",
  forbiddenRoomId: "room-forbidden-e2e",
  wsConnectErrorTokenBase: "e2e-ws-connect-error-token",
  // 이 방은 목 WS가 토큰당 1회만 강제로 연결을 끊는다(재연결 시나리오 트리거).
  reconnectRoomId: "room-reconnect-e2e",
} as const;
```

- [ ] **Step 4: 목 WS에 1회성 강제 disconnect 로직 추가**

`e2e/mock-ws/server.ts`의 `io.on("connection", (socket) => { ... })` 블록 **바로 위**에 모듈 스코프 상태 추가:

```ts
// reconnectRoomId 전용 — 토큰별로 "이미 한 번 끊었는지" 기억해 무한 재연결 루프를 막는다.
const disconnectOnceTokens = new Set<string>();
```

`socket.on("join", (payload: { roomId: string }) => { ... })` 블록 전체를 다음으로 교체:

```ts
  socket.on("join", (payload: { roomId: string }) => {
    if (payload?.roomId === E2E_CHAT.forbiddenRoomId) {
      socket.emit("error", { code: "CHAT_NOT_ROOM_PARTICIPANT" });
      return;
    }
    if (payload?.roomId === E2E_CHAT.reconnectRoomId) {
      const token = String(socket.handshake.auth?.token ?? "");
      if (!disconnectOnceTokens.has(token)) {
        disconnectOnceTokens.add(token);
        socket.disconnect(true);
        return;
      }
    }
  });
```

- [ ] **Step 5: 실행해 통과 확인**

Run: `pnpm e2e e2e/tests/chat.spec.ts`
Expected: 기존 5개 + 신규 1개 = 6개 테스트 모두 PASS.

- [ ] **Step 6: Commit**

```bash
git add e2e/fixtures/e2e-constants.ts e2e/mock-ws/server.ts e2e/tests/chat.spec.ts
git commit -m "test: 채팅 E2E — 재연결 시나리오(강제 disconnect + 자동 재연결)"
```

---

### Task 3: 멀티유저 수신 — 룸 브로드캐스트 + 동적 senderId

**Files:**
- Modify: `e2e/mock-ws/server.ts`
- Modify: `e2e/tests/chat.spec.ts`

**Interfaces:**
- Consumes: Task 1·2의 `join` 핸들러 구조(그 로직 아래에 이어 붙임), 기존 `E2E_OWNER_TOKEN`(`e2e/fixtures/e2e-constants.ts`, 이미 export됨).
- Produces: 없음(이 플랜의 마지막 코드 변경 태스크).

- [ ] **Step 1: 실패하는 테스트 작성**

`e2e/tests/chat.spec.ts` 상단 import에 `randomUUID` 추가(파일 최상단, 다른 import들 위):

```ts
import { randomUUID } from "node:crypto";
```

파일 끝에 테스트 추가:

```ts
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
  await expect(tenantSend).toBeEnabled({ timeout: 15_000 });

  const ownerInput = ownerPage.getByPlaceholder(MESSAGES.chat.inputPlaceholder);
  const ownerSend = ownerPage.getByRole("button", { name: "전송" });
  await expect(ownerSend).toBeEnabled({ timeout: 15_000 });

  const fromTenant = "TENANT가 보낸 메시지";
  await tenantInput.fill(fromTenant);
  await tenantSend.click();
  await expect(ownerPage.getByText(fromTenant)).toBeVisible();

  const fromOwner = "OWNER가 보낸 메시지";
  await ownerInput.fill(fromOwner);
  await ownerSend.click();
  await expect(tenantPage.getByText(fromOwner)).toBeVisible();

  await tenantContext.close();
  await ownerContext.close();
});
```

- [ ] **Step 2: 실행해 실패 확인**

Run: `pnpm e2e e2e/tests/chat.spec.ts -g "상대방이 보낸"`
Expected: FAIL — 목 WS가 `socket.join()`을 하지 않고 `socket.emit`으로 발신자에게만 되돌리므로, 상대방 페이지에는 메시지가 도착하지 않아 `expect(ownerPage.getByText(fromTenant)).toBeVisible()`이 타임아웃.

- [ ] **Step 3: 목 WS import에 `E2E_OWNER_TOKEN` 추가**

`e2e/mock-ws/server.ts` 상단 import를 다음으로 교체:

```ts
import { E2E_CHAT, E2E_OWNER_TOKEN } from "../fixtures/e2e-constants";
```

- [ ] **Step 4: `join`에 실제 room 합류 추가**

Task 2에서 만든 `socket.on("join", ...)` 핸들러 마지막(두 `if` 블록 다음, 함수 닫는 중괄호 직전)에 한 줄 추가:

```ts
  socket.on("join", (payload: { roomId: string }) => {
    if (payload?.roomId === E2E_CHAT.forbiddenRoomId) {
      socket.emit("error", { code: "CHAT_NOT_ROOM_PARTICIPANT" });
      return;
    }
    if (payload?.roomId === E2E_CHAT.reconnectRoomId) {
      const token = String(socket.handshake.auth?.token ?? "");
      if (!disconnectOnceTokens.has(token)) {
        disconnectOnceTokens.add(token);
        socket.disconnect(true);
        return;
      }
    }
    socket.join(payload.roomId);
  });
```

- [ ] **Step 5: `message`를 룸 브로드캐스트 + 동적 senderId로 변경**

`socket.on("message", (payload: { roomId: string; content: string }) => { ... })` 블록 전체를 다음으로 교체:

```ts
  socket.on("message", (payload: { roomId: string; content: string }) => {
    // 발신자 판별 — 목 BE(HTTP)의 OWNER 판별 관례(bearer(req).includes(E2E_OWNER_TOKEN))와 동일.
    const token = String(socket.handshake.auth?.token ?? "");
    const senderId = token.includes(E2E_OWNER_TOKEN) ? "u-owner-e2e" : "u-e2e";
    const echo: ChatMessage = {
      roomId: payload.roomId,
      messageId: `m-echo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      senderId,
      content: payload.content,
      createdAt: new Date().toISOString(),
    };
    // 발신자 포함 방 전체에 브로드캐스트. 1인 방(기존 해피패스)이면 발신자 본인만 있으므로
    // 기존 "본인에게만 echo" 동작과 결과가 같다(회귀 없음).
    io.to(payload.roomId).emit("message", echo);
  });
```

- [ ] **Step 6: 실행해 통과 확인 — 신규 테스트 + 기존 전체 회귀**

Run: `pnpm e2e e2e/tests/chat.spec.ts`
Expected: 기존 6개 + 신규 1개 = 7개 테스트 모두 PASS. 특히 기존 해피패스("방에 연결되면 메시지를 보내고 에코를 받는다")와 비참가자 테스트가 그대로 통과하는지 확인(회귀 없음).

- [ ] **Step 7: Commit**

```bash
git add e2e/mock-ws/server.ts e2e/tests/chat.spec.ts
git commit -m "test: 채팅 E2E — 멀티유저 수신 시나리오(room 브로드캐스트)"
```

---

### Task 4: burn-in + 전체 스위트 회귀 확인

**Files:**
- 없음(코드 변경 없음, 검증만).

**Interfaces:**
- 없음.

- [ ] **Step 1: 채팅 스펙만 burn-in**

Run: `npx playwright test --repeat-each=5 e2e/tests/chat.spec.ts`
Expected: 7개 테스트 × 5회 반복 × 3브라우저 = 105개 실행 전부 PASS, 실패 0건.
(`pnpm e2e:burn -- <file>`은 pnpm 인자 전달 문제로 파일 필터가 무시될 수 있다 — 기존 카카오 E2E 작업에서 확인된 이슈이므로 `npx playwright test --repeat-each=5 <file>`을 직접 쓴다.)

- [ ] **Step 2: 전체 E2E 스위트 회귀 확인**

Run: `pnpm e2e`
Expected: 전체 스위트(기존 + 채팅 신규 3개) 전부 PASS, 실패 0건.

- [ ] **Step 3: 유닛테스트·lint·typecheck**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: 전부 통과(이번 태스크들은 `e2e/`만 건드리므로 원래도 영향 없어야 하지만, 회귀 확인 차원에서 실행).

커밋 없음(코드 변경 없는 검증 태스크).

---

### Task 5: README 백로그·커버리지 갱신

**Files:**
- Modify: `README.md`

**Interfaces:**
- 없음(문서 갱신만).

- [ ] **Step 1: 커버리지 표의 채팅 행 갱신**

`README.md`의 커버리지 표에서 다음 행을 찾는다:

```
| 채팅 (방 목록→진입 · start-chat 방생성 · 1:1 실시간 연결·전송→에코 · 비참가자 에러, 목 socket.io) | ✅ |
```

다음으로 교체:

```
| 채팅 (방 목록→진입 · start-chat 방생성 · 1:1 실시간 연결·전송→에코 · 비참가자 에러 · 재연결 · connect_error · 멀티유저 수신, 목 socket.io) | ✅ |
```

- [ ] **Step 2: 후속 백로그에서 해당 항목 제거**

`### 후속 백로그 (남은 작업)` 섹션의 완료 항목 안내 줄:

```
> 완료된 항목(알림·온보딩·초대코드·채팅·설정·대시보드·게시판/프로필/알림 영속성·폼검증·멀티브라우저·`MESSAGES.auth.login`·카카오 로그인 E2E)은 위 커버리지 표에 반영. 아래는 **남은 작업**만. 우선순위 순으로 정렬(2026-07-02 지정).
```

를 다음으로 교체:

```
> 완료된 항목(알림·온보딩·초대코드·채팅·설정·대시보드·게시판/프로필/알림 영속성·폼검증·멀티브라우저·`MESSAGES.auth.login`·카카오 로그인 E2E·채팅 재연결/connect_error/멀티유저 E2E)은 위 커버리지 표에 반영. 아래는 **남은 작업**만. 우선순위 순으로 정렬(2026-07-02 지정).
```

`- [ ] **[우선순위 1] 채팅 E2E 확장(잔여)**: 재연결/`connect_error`·멀티유저 수신(상대가 보낸 메시지)만 미커버 — 방 목록·진입·start-chat·실시간 연결·전송→에코·비참가자 에러는 커버 완료(스펙: `docs/test/e2e-chat-spec.md`).` 줄을 삭제하고, 남은 우선순위를 한 칸씩 당긴다. 결과:

```
- [ ] **[우선순위 1] 공식 에이전트 도입 검토**: Playwright Planner/Generator/Healer(`init-agents`).
- [ ] 드리프트 게이트 확장: leases · buildings 플로우가 실 픽스처로 채워지면 `mockLease()`·`mockBuilding()` 등 타입드 빌더로 편입(알림은 `mockNotifications()`로 편입 완료).
- [ ] 테스트 typecheck 정비: `tsconfig.vitest.json` 분리 + `vi.fn()` 파라미터 타입화(약 44건) + `**/*.test.*` exclude 제거 — 현재 루트 tsconfig의 `types:["vitest/globals"]` 스톱갭 해소.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: 채팅 E2E 확장(재연결·connect_error·멀티유저) 완료 반영"
```
