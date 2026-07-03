# E2E 스펙 — 채팅 재연결 · connect_error · 멀티유저 수신

> 작성: 2026-07-03 · 대상: 채팅 E2E 확장(잔여, README 후속 백로그 우선순위 1) · 방식: SDD 풀. WebSocket 실시간 실패/멀티유저 분기라 복잡 플로우로 분류.

## Context / 목표

`docs/test/e2e-chat-spec.md`(옵션 B)로 연결·전송→에코 해피패스와 비참가자 에러는 이미 커버됐다. 그 스펙의 "Out of Scope(후속)"에 명시된 두 항목이 남아 있다:

1. 재연결·`connect_error` 실패 분기
2. 멀티유저 수신(상대가 보낸 메시지)

본 스펙은 이 두 항목을 커버한다.

## Current State (확인됨)

- `components/chat/chat-conversation.tsx`: `io(WS_URL, { auth: { token }, transports: ["websocket"] })` — reconnection 옵션 미지정(socket.io-client 기본값: 자동 재연결 on). `disconnect` → `MESSAGES.chat.disconnected`("연결이 끊어졌어요. 재연결 중…") 노출 + 전송버튼 비활성. `connect_error` → `MESSAGES.chat.connectFailed` 노출. `connect` 재발생 시 `join` 재emit, 에러 초기화.
- `app/(app)/chat/[roomId]/page.tsx`: 세션 쿠키 토큰을 그대로 `ChatConversation`의 `token` prop(→ WS `auth.token`)으로 넘긴다. **핸드셰이크에는 token만 있고 roomId는 없다** — `join` emit(연결 후)에만 roomId가 실린다.
- `e2e/mock-ws/server.ts`: `io.use()` 미들웨어 없음(인증 미검증). `join` 핸들러는 `forbiddenRoomId` 체크만 하고 **`socket.join()`을 호출하지 않는다**(소켓이 실제 socket.io room에 들어가지 않음). `message` 핸들러는 `socket.emit`으로 **발신자에게만** 에코하며 `senderId`를 `"u-e2e"`로 하드코딩한다.
- 목 BE `mockChatRoom()`: `ownerId:"u-owner-e2e"`, `tenantId:"u-e2e"` — 이미 2자 구도로 세팅되어 있다(`e2e/fixtures/mock-data.ts`).
- `e2e/fixtures/auth.ts`의 `loginAs`/`loginAsOwner`는 매 호출 `${base}-${randomUUID()}` 유니크 토큰을 세션 쿠키로 주입한다(3브라우저 병렬 격리 관례, `docs/test/e2e-stateful-mock-spec.md` 옵션 A 패턴).

## 범위 결정 (사용자 확인 완료)

- **재연결**: "끊김 UI 전환"만이 아니라 **재연결 후 송수신까지 단언**한다(재연결이 실제로 다시 쓸 수 있는 상태인지 증명).
- **connect_error 트리거**: room 기반(기존 `forbiddenRoomId` 패턴)은 핸드셰이크에 roomId가 없어 불가. **전용 세션 토큰**(`loginAsWsConnectError` 신설)으로 트리거한다. 앱 코드는 변경하지 않는다.
- **멀티유저 방 ID**: 고정 상수 대신 **테스트마다 `crypto.randomUUID()`로 방 ID를 생성**한다. 3브라우저(chromium·firefox·webkit)가 같은 스펙을 동시 실행해도 방이 섞이지 않는다(기존 `loginAs` uuid-토큰 격리와 동일 원리).

## 설계

앱 코드는 건드리지 않는다. 목 WS 서버만 확장한다.

### 1) 재연결

- `E2E_CHAT.reconnectRoomId` 상수 추가.
- 목 WS: 이 방으로 `join`이 들어오면 **토큰별 1회만** `socket.disconnect(true)`(모듈 스코프 `Set<token>`으로 추적 — 이미 끊은 토큰은 재입장 시 통과). 클라이언트는 socket.io-client 기본 재연결(on)로 자동 재시도.
- Acceptance: ①입장 시 전송버튼 활성 ②강제 종료 후 "연결이 끊어졌어요…" 노출 + 전송버튼 비활성 ③자동 재연결 후 전송버튼 재활성 ④메시지 전송→에코 도착.

### 2) connect_error

- `e2e/fixtures/auth.ts`에 `loginAsWsConnectError(context)` 추가 — `loginAs`/`loginAsOwner`와 동일한 `injectSession` 패턴, 신규 sentinel 토큰 베이스 사용.
- `E2E_CHAT.wsConnectErrorTokenBase` 상수 추가.
- 목 WS에 `io.use((socket, next) => { ... })` 추가: `socket.handshake.auth.token`이 이 베이스로 시작하면 `next(new Error("connect_error"))`.
- Acceptance: 방 페이지 진입 시 `MESSAGES.chat.connectFailed`가 노출된다(연결 자체가 성립하지 않음 — `connect`/`join`이 전혀 발생하지 않는다).

### 3) 멀티유저 수신

- 목 WS `join` 핸들러에 `socket.join(payload.roomId)` 추가(현재 누락 — 이게 있어야 `io.to(roomId)` 브로드캐스트가 실제로 작동한다).
- `message` 핸들러: `socket.emit` → `io.to(payload.roomId).emit`으로 변경(발신자 포함 방 전체 브로드캐스트 — 기존 해피패스는 발신자=수신자라 동작 동일, 회귀 없음).
- `senderId`: 하드코딩 `"u-e2e"` → 토큰 기반 판별로 변경(`token.includes(E2E_OWNER_TOKEN)` → `"u-owner-e2e"`, 그 외 → `"u-e2e"`; 기존 HTTP 목의 OWNER 판별 관례와 동일 — `bearer(req).includes(E2E_OWNER_TOKEN)`).
- 테스트: `browser.newContext()`로 TENANT/OWNER 두 컨텍스트 생성 → `loginAs`/`loginAsOwner` 각각 주입 → `crypto.randomUUID()`로 만든 방 ID(`room-multiuser-<uuid>`)로 두 페이지 모두 입장.
- Acceptance: 한쪽이 보낸 메시지가 상대 화면에 "내 메시지 아님"(좌측 정렬, `bg-surface-2`) 버블로 나타난다. 기존 해피패스·비참가자 테스트는 회귀 없이 그대로 통과한다.

## Files Reference

| File | Change |
|------|--------|
| `e2e/fixtures/e2e-constants.ts` | `E2E_CHAT`에 `reconnectRoomId`·`wsConnectErrorTokenBase` 추가 |
| `e2e/fixtures/auth.ts` | `loginAsWsConnectError` 신설 |
| `e2e/mock-ws/server.ts` | `io.use()` 인증 거부 미들웨어, `join`에 `socket.join()`+재연결 트리거, `message`에 room 브로드캐스트+동적 senderId |
| `e2e/tests/chat.spec.ts` | 재연결·connect_error·멀티유저 시나리오 3개 추가 |
| `README.md` | 커버리지 표 채팅 행 갱신, 백로그에서 해당 항목 제거 |

## Acceptance Criteria (전체)

1. 재연결: 끊김→UI 전환→자동 재연결→송수신 정상.
2. connect_error: 전용 토큰 접속 시 연결 실패 안내 노출.
3. 멀티유저: 상대가 보낸 메시지가 "내 메시지 아님" 스타일로 렌더.
4. 3브라우저(chromium·firefox·webkit) + burn-in(`--repeat-each=5`) 무 flaky.
5. 기존 채팅 E2E(해피패스·목록·비참가자·문의시작) 회귀 없음.
6. 앱 코드(`app/`·`components/`·`lib/`) 변경 없음 — 목 WS와 E2E 인프라만 확장.

## Out of Scope

- WS 재연결 백오프 타이밍 자체의 정밀 검증(지수 백오프 간격 등) — "재연결되어 다시 쓸 수 있다"만 증명.
- 3인 이상 멀티유저, 타이핑 인디케이터·읽음 확인 등 미구현 기능.
- `connect_error` 이후 자동 재시도 성공 케이스(현재 시나리오는 "계속 거부됨" 상태만 확인).
