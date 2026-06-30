# FE API fetch 헬퍼 확장 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 인증 POST/PATCH·비인증 POST용 fetch 헬퍼를 `lib/api/client.ts`에 추가하고, 도메인 모듈의 반복 보일러플레이트를 헬퍼 호출로 치환한다.

**Architecture:** 기존 `call`/`authGet` 함수형 래퍼에 `post`·`authPost`·`authPatch`를 같은 패턴으로 추가한다. 도메인 함수의 외부 시그니처(`token`을 인자로 받음)는 그대로 두고 내부 구현만 헬퍼로 바꾼다. 클래스/인스턴스 도입 없음(SSR 토큰 안전·트리쉐이킹 유지).

**Tech Stack:** TypeScript, Next.js App Router, Vitest(jsdom, globals).

**Spec:** `docs/plans/fe-api-fetch-helpers-20260630.md`

## Global Constraints

- `.ts`/`.tsx`만 사용. 신규 `.js`/`.jsx` 금지.
- `enum` 금지, `as any` 금지, index signature 금지.
- `errorMap` 기본값 `{}` — 자동 401 병합 없음. 호출부가 상태코드 메시지를 명시.
- 인증 헬퍼의 `body`는 선택 인자. body 미지정 시 init에 `body` 키가 없어야 함.
- DELETE/PUT 헬퍼는 만들지 않음(현재 사용처 없음, YAGNI).
- 도메인 함수 외부 시그니처 무변경 → `app/**` 호출부 수정 불필요.
- 검증: `npm run test`, `npm run build`, `npm run lint` 모두 통과.

---

### Task 1: client.ts 헬퍼 추가 (`post`·`authPost`·`authPatch`)

**Files:**
- Modify: `lib/api/client.ts`
- Test: `lib/api/client.test.ts` (Create)

**Interfaces:**
- Consumes: 기존 `call<T>(path, init, errorMap)`, `ApiError`, `BACKEND_URL`, `MESSAGES`.
- Produces:
  - `post<T>(path: string, body: unknown, errorMap?: Record<number, string>): Promise<T>`
  - `authPost<T>(path: string, token: string, body?: unknown, errorMap?: Record<number, string>): Promise<T>`
  - `authPatch<T>(path: string, token: string, body?: unknown, errorMap?: Record<number, string>): Promise<T>`
  - `call`의 `errorMap` 파라미터가 선택(기본 `{}`)이 됨.

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/api/client.test.ts` 생성:

```ts
import { vi } from "vitest";
import { post, authPost, authPatch } from "./client";

function mockFetch(status = 200, json: unknown = {}) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(json), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

it("post: 비인증 POST로 body를 직렬화하고 Authorization 헤더가 없다", async () => {
  const fetchMock = mockFetch(200);
  await post("/x", { a: 1 });
  const init = fetchMock.mock.calls[0][1] as RequestInit;
  expect(init.method).toBe("POST");
  expect(JSON.parse(String(init.body))).toEqual({ a: 1 });
  expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
});

it("authPost(body 有): Bearer 헤더 + 직렬화된 body를 보낸다", async () => {
  const fetchMock = mockFetch(201);
  await authPost("/x", "tok", { a: 1 });
  const init = fetchMock.mock.calls[0][1] as RequestInit;
  expect(init.method).toBe("POST");
  expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  expect(JSON.parse(String(init.body))).toEqual({ a: 1 });
});

it("authPost(body 無): init에 body 키가 없다", async () => {
  const fetchMock = mockFetch(200);
  await authPost("/x", "tok");
  const init = fetchMock.mock.calls[0][1] as RequestInit;
  expect("body" in init).toBe(false);
});

it("authPatch(body 無): PATCH·Bearer·body 키 없음", async () => {
  const fetchMock = mockFetch(200);
  await authPatch("/x", "tok");
  const init = fetchMock.mock.calls[0][1] as RequestInit;
  expect(init.method).toBe("PATCH");
  expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  expect("body" in init).toBe(false);
});

it("errorMap 매칭 시 해당 메시지로 ApiError를 던진다", async () => {
  mockFetch(404);
  await expect(authPost("/x", "tok", { a: 1 }, { 404: "없음" })).rejects.toMatchObject({
    status: 404,
    message: "없음",
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -- lib/api/client.test.ts`
Expected: FAIL — `post is not a function` (아직 export 없음).

- [ ] **Step 3: 헬퍼 구현**

`lib/api/client.ts`의 `call` 시그니처에 기본값을 주고, 파일 끝(또는 `authGet` 뒤)에 헬퍼 3종을 추가한다.

`call` 시그니처 변경(기존 구현 본문은 유지):

```ts
export async function call<T>(
  path: string,
  init: RequestInit,
  errorMap: Record<number, string> = {},
): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const msg = errorMap[res.status] ?? MESSAGES.common.requestFailed;
    throw new ApiError(res.status, msg);
  }
  return (await res.json()) as T;
}
```

`authGet` 뒤에 추가:

```ts
// 비인증 POST — signup, login 등
export function post<T>(path: string, body: unknown, errorMap: Record<number, string> = {}) {
  return call<T>(path, { method: "POST", body: JSON.stringify(body) }, errorMap);
}

// 인증 POST — body 선택(없는 요청도 동일 헬퍼로 커버)
export function authPost<T>(path: string, token: string, body?: unknown, errorMap: Record<number, string> = {}) {
  return call<T>(path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  }, errorMap);
}

// 인증 PATCH — body 선택(notification처럼 body 없는 요청 커버)
export function authPatch<T>(path: string, token: string, body?: unknown, errorMap: Record<number, string> = {}) {
  return call<T>(path, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  }, errorMap);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test -- lib/api/client.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: 커밋**

```bash
git add lib/api/client.ts lib/api/client.test.ts
git commit -m "feature: client.ts에 post/authPost/authPatch 헬퍼 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: 도메인 모듈을 헬퍼로 치환

**Files:**
- Modify: `lib/api/auth.ts`, `lib/api/building.ts`, `lib/api/chat.ts`, `lib/api/board.ts`, `lib/api/unit.ts`, `lib/api/invite.ts`, `lib/api/notification.ts`
- Test(회귀): `lib/api.test.ts`, `lib/chat-api.test.ts` (수정 없음, 그대로 통과해야 함)

**Interfaces:**
- Consumes: Task 1의 `post`, `authPost`, `authPatch`, 기존 `authGet`, `call`.
- Produces: 외부 시그니처 무변경. `app/**` 호출부 영향 없음.

- [ ] **Step 1: auth.ts 치환**

`lib/api/auth.ts` 전체를 아래로 교체:

```ts
import { post, authGet, authPatch } from "./client";
import { MESSAGES } from "../messages";
import { SignupRole } from "../constants";
export type { SignupRole };

export type Me = { id: string; email: string; role: "OWNER" | "TENANT" | "ADMIN" };

export const backendSignup = (email: string, name: string, password: string, role: SignupRole) =>
  post<{ id: string; email: string; role: string }>("/auth/signup",
    { email, name, password, role },
    { 400: MESSAGES.form.invalidInput, 409: MESSAGES.auth.emailInUse });

export const backendLogin = (email: string, password: string) =>
  post<{ accessToken: string }>("/auth/login",
    { email, password },
    { 401: MESSAGES.auth.invalidCredentials });

export const backendMe = (t: string) => authGet<Me>("/auth/me", t);

export type Profile = { id: string; email: string; name: string; role: "OWNER" | "TENANT" | "ADMIN" };

export const backendProfile = (t: string) => authGet<Profile>("/auth/profile", t);

export const backendUpdateProfile = (t: string, body: { name: string }) =>
  authPatch<Profile>("/auth/profile", t, body);

export const backendChangePassword = (t: string, body: { currentPassword: string; newPassword: string }) =>
  authPatch<{ ok: true }>("/auth/password", t, body, { 401: MESSAGES.settings.wrongCurrentPassword });
```

- [ ] **Step 2: building.ts 치환**

`backendCreateBuilding`의 `call(...)`를 `authPost`로 바꾸고 import에서 `call` 제거:

```ts
import { authGet, authPost } from "./client";

export type Building = { id: string; name: string; address: string };
export type Unit = { id: string; buildingId: string; name: string; floor: number };

export const backendMyBuildings = (t: string) => authGet<Building[]>("/buildings", t);

export const backendBuildingUnits = (t: string, buildingId: string) =>
  authGet<Unit[]>(`/buildings/${buildingId}/units`, t);

export const backendCreateBuilding = (t: string, body: { name: string; address: string }) =>
  authPost<Building>("/buildings", t, body);
```

- [ ] **Step 3: chat.ts 치환**

`backendEnsureRoom`을 `authPost`로 바꾸고 import에서 `call` 제거(타입 정의는 그대로 유지):

```ts
import { authGet, authPost } from "./client";

// ... ChatRoom / ChatMessage 타입 정의는 기존 그대로 유지 ...

export const backendMyRooms = (t: string) => authGet<ChatRoom[]>("/chat/rooms", t);

export const backendRoomMessages = (t: string, roomId: string, limit = 50) =>
  authGet<ChatMessage[]>(`/chat/rooms/${roomId}/messages?limit=${limit}`, t);

export const backendEnsureRoom = (t: string, body: { buildingId: string; tenantId: string }) =>
  authPost<ChatRoom>("/chat/rooms", t, body);
```

- [ ] **Step 4: board.ts 치환**

`backendCreatePost`·`backendCreateComment`를 `authPost`로 바꾸고 import에서 `call` 제거(타입 정의 유지):

```ts
import { authGet, authPost } from "./client";
import type { PostCategory } from "../constants";

// ... Post / Comment / PostDetail 타입 정의는 기존 그대로 유지 ...

export const backendListPosts = (t: string, buildingId: string) =>
  authGet<Post[]>(`/buildings/${buildingId}/posts`, t);

export const backendGetPost = (t: string, postId: string) =>
  authGet<PostDetail>(`/posts/${postId}`, t);

export const backendCreatePost = (
  t: string,
  buildingId: string,
  body: { category?: PostCategory; title: string; content: string },
) => authPost<Post>(`/buildings/${buildingId}/posts`, t, body);

export const backendCreateComment = (t: string, postId: string, content: string) =>
  authPost<Comment>(`/posts/${postId}/comments`, t, { content });
```

- [ ] **Step 5: unit.ts 치환**

```ts
import { authPost } from "./client";
import type { Unit } from "./building";

export const backendCreateUnit = (t: string, buildingId: string, body: { name: string; floor: number }) =>
  authPost<Unit>(`/buildings/${buildingId}/units`, t, body);
```

- [ ] **Step 6: invite.ts 치환**

`redeem`·`issue`를 `authPost`로 변경. `preview`는 비인증 GET이라 `call` 유지(헬퍼 추가 안 함):

```ts
import { call, authPost } from "./client";
import { MESSAGES } from "../messages";

export const backendPreviewInvite = (code: string) =>
  call<{ valid: boolean; buildingName?: string; unitName?: string }>(
    `/invite-codes/${encodeURIComponent(code)}/preview`, { method: "GET" });

export const backendRedeemInvite = (token: string, code: string) =>
  authPost<{ id: string; unitId: string; status: string }>("/invite-codes/redeem", token, { code },
    { 404: MESSAGES.invite.invalid });

export const backendIssueInvite = (t: string, unitId: string) =>
  authPost<{ code: string; expiresInSec: number }>(`/units/${unitId}/invite-codes`, t);
```

- [ ] **Step 7: notification.ts 치환**

`markAllRead`·`markOneRead`(body 없는 PATCH)를 `authPatch`로 변경, import에서 `call` 제거(타입 유지):

```ts
import { authGet, authPatch } from "./client";
import type { NotificationType } from "../constants";

// ... Notification 타입 정의는 기존 그대로 유지 ...

export const backendNotifications = (t: string, limit = 50) =>
  authGet<Notification[]>(`/notifications?limit=${limit}`, t);

export const backendUnreadCount = (t: string) =>
  authGet<{ count: number }>("/notifications/unread-count", t);

export const backendMarkAllRead = (t: string) =>
  authPatch<{ ok: true }>("/notifications/read", t);

export const backendMarkOneRead = (t: string, id: string) =>
  authPatch<{ ok: true }>(`/notifications/${id}/read`, t);
```

> 주의: `markAllRead`·`markOneRead`는 body가 없는 PATCH다. `authPatch(path, token)`로만 호출하고
> `id`는 path 템플릿에만 쓴다(세 번째 인자로 넘기지 않는다).

- [ ] **Step 8: 전체 회귀 테스트**

Run: `npm run test`
Expected: PASS — 기존 `lib/api.test.ts`(login/me)·`lib/chat-api.test.ts`(myRooms/roomMessages/ensureRoom) 및 Task 1 테스트 모두 통과.

- [ ] **Step 9: 보일러플레이트 제거 확인 (grep)**

Run: `grep -rEn "method:|Authorization|JSON.stringify" lib/api/*.ts | grep -v client.ts | grep -v "invite.ts.*method"`
Expected: 출력 없음(= 도메인 파일에서 직접 method/Authorization/stringify 사용 사라짐). invite.ts의 preview GET(`{ method: "GET" }`)만 예외로 남음.

- [ ] **Step 10: 빌드·린트**

Run: `npm run lint && npm run build`
Expected: 둘 다 통과(사용하지 않는 `call` import 잔존 시 lint 실패 → 해당 import 제거).

- [ ] **Step 11: 커밋**

```bash
git add lib/api/auth.ts lib/api/building.ts lib/api/chat.ts lib/api/board.ts lib/api/unit.ts lib/api/invite.ts lib/api/notification.ts
git commit -m "refactor: 도메인 API 모듈을 post/authPost/authPatch 헬퍼로 치환

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

- **Spec 커버리지:** spec의 헬퍼 3종 → Task 1. 도메인 치환(7파일) → Task 2 Step 1~7.
  테스트 → Task 1 Step 1, 회귀 → Task 2 Step 8. 성공 기준(grep/test/build/lint) → Task 2 Step 8~10. 누락 없음.
- **Placeholder:** 없음. 모든 step에 실제 코드/명령 포함. (Step 7의 `id` 오기는 같은 step에서
  확정본으로 교정 — 구현자가 헷갈리지 않도록 명시.)
- **타입 일관성:** `authPost`/`authPatch` 시그니처(`path, token, body?, errorMap?`)가 Task 1 정의와
  Task 2 호출에서 일치. `post(path, body, errorMap?)`도 일치.
- **invite.preview:** 비인증 GET은 헬퍼 미도입 결정(YAGNI)에 따라 `call` 유지 — Step 6·9에 반영.
