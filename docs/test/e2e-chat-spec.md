# E2E 스펙 — 채팅(1:1 실시간) 플로우

> 작성: 2026-07-02 · 대상: FE-M4 채팅 · 방식: SDD(스펙 → 구현). 채팅은 WebSocket 실시간이라
> 결정론적 E2E 설계가 핵심이라 복잡 플로우로 분류, 스펙을 선행한다.

## Context

채팅은 "실패 시 손상이 큰" 핵심 플로우(입주자↔건물주 1:1 소통)지만, 실시간이라
지금까지 E2E에서 제외돼 있었다(README 백로그: "고비용·flaky 위험"). 다른 4개 플로우
(로그인·온보딩·게시판·알림·건물)는 커버 완료라, 남은 실시간 경로를 결정론적으로 커버한다.

## Current State (검증됨, 2026-07-02)

- 방 페이지 `app/(app)/chat/[roomId]/page.tsx`: SSR이 `backendRoomMessages`
  (`GET /chat/rooms/:id/messages`)로 히스토리 로드 → `ChatConversation`에 전달.
- `components/chat/chat-conversation.tsx`: `socket.io-client`로 `WS_URL`에 연결
  (`lib/chat/ws.ts` → `NEXT_PUBLIC_WS_URL ?? "http://localhost:3001"`). `connect` 시
  `join` emit, `message` 수신 시 목록 append(messageId 기준 dedup), 전송은 `message` emit.
  **전송 버튼은 `connected===true`까지 비활성**, 미연결 시 "연결이 끊어졌어요…" 노출.
- E2E `playwright.config.ts` webServer는 Next에 `BACKEND_URL`만 주입 →
  `NEXT_PUBLIC_WS_URL` 미설정이라 채팅 클라가 실 BE(:3001)로 붙으려다 실패.
- 목 BE(`e2e/mock-be/server.ts`, node:http): `GET /chat/rooms` → `[]`,
  `/chat/rooms/:id/messages`·`POST /chat/rooms` 핸들러 없음(404).

## 설계 결정 (사용자 확정)

**옵션 B — 소켓 목 + 실시간 happy-path만.** socket.io 목 서버를 도입해 한 방에서
`connect → 전송 → 에코 수신`까지 커버한다. 방 목록·start-chat 방생성 REST 커버는 후속.

- 근거: 채팅의 실제 가치는 실시간 송수신. REST-only는 이미 다른 플로우가 검증한 패턴
  (목록 렌더·SSR)만 반복하고 정작 어렵고 값진 실시간을 건너뛴다.
- 플레인 `ws`는 socket.io 핸드셰이크(engine.io)를 못 하므로 서버측 `socket.io`(devDep) 추가.

## Mock 인프라 설계

- `e2e/mock-ws/server.ts`: `socket.io` `Server`를 http 서버(포트 3098, `/health` 응답)에
  attach. `connection` 시 `join`은 무시(ack 불필요), `message`({roomId, content}) 수신 시
  같은 소켓으로 `message`를 **에코**(senderId=`u-e2e`=mockMe id → 내 메시지로 렌더).
  auth 토큰은 검증하지 않음(목).
- `playwright.config.ts`: webServer에 mock-ws 엔트리 추가 + Next `env`에
  `NEXT_PUBLIC_WS_URL: http://localhost:3098`(빌드타임 baked).
- `package.json`: `socket.io` devDep + `e2e:mock-ws` 스크립트.
- 목 BE: `GET /chat/rooms/:id/messages` → `[]`(방 진입 SSR 404 제거; 실시간만 테스트하므로
  히스토리는 빈 상태로 두고 전송한 에코만 단언).
- 결합 상수: `E2E_CHAT`(`e2e/fixtures/e2e-constants.ts`) — roomId 등 단일 출처.

## 시나리오 / Acceptance Criteria

1. 방 페이지 진입 시 socket이 연결되어 **전송 버튼이 활성화**된다(=connected).
2. 메시지를 입력하고 전송하면, 에코로 되돌아온 **메시지 버블이 목록에 나타난다**.
3. 미연결 안내("연결이 끊어졌어요…")가 연결 후 사라진다(1의 다른 표현 — 전송버튼 활성으로 대체 단언).

- 셀렉터: 시멘틱만(`getByRole("button", { name: "전송" })`, `getByPlaceholder`, `getByText`).
- 하드 대기 금지 → `expect` auto-wait(전송버튼 enabled, 버블 텍스트 visible).
- burn-in(`--repeat-each=5`) 1회 이상 실패 시 머지 전 수정.

## Out of Scope (후속)

- 방 목록 렌더(`GET /chat/rooms` seed) · start-chat 방생성(`POST /chat/rooms`) REST 커버.
- 재연결·`connect_error`·`CHAT_NOT_ROOM_PARTICIPANT` 등 실패 분기.
- 멀티유저(상대방이 보낸 메시지 수신) — 목은 단일 소켓 에코만.

## Files Reference

| File | Change |
|------|--------|
| `package.json` | `socket.io` devDep + `e2e:mock-ws` 스크립트 |
| `e2e/mock-ws/server.ts` | 신규 — socket.io 에코 목 서버 |
| `playwright.config.ts` | webServer에 mock-ws + `NEXT_PUBLIC_WS_URL` env |
| `e2e/mock-be/server.ts` | `GET /chat/rooms/:id/messages` → `[]` |
| `e2e/fixtures/e2e-constants.ts` | `E2E_CHAT` 결합 상수 |
| `e2e/tests/chat.spec.ts` | 신규 — 연결·전송→에코 수신 |
| `README.md` | 커버리지 표에 채팅 행 |
