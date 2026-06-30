# FE API fetch 헬퍼 확장 (보일러플레이트 제거)

- 작성일: 2026-06-30
- 대상: `lib/api/`
- 관련 규칙: `CLAUDE.md` / `AGENTS.md` "API 클라이언트 구조", TDD Requirements

## 배경 / 문제

FE에서 백엔드 호출 시 `lib/api/client.ts`의 `call`(공통 fetch 래퍼)과
`authGet`(GET 전용 인증 헬퍼)을 사용한다. 그러나 **인증이 필요한 POST/PATCH**에는
헬퍼가 없어, 도메인 함수마다 동일한 보일러플레이트가 반복된다.

```ts
// 현재: 도메인 함수마다 반복
call<Profile>("/auth/profile", {
  method: "PATCH",
  headers: { Authorization: `Bearer ${t}` },
  body: JSON.stringify(body),
}, {});
```

반복되는 요소: `method` · `JSON.stringify(body)` · `Authorization` 헤더 · `errorMap`.

### 중복 현황 (survey)

| 패턴 | 사용처 |
|------|--------|
| GET (인증) | `authGet` 이미 존재 |
| POST (인증, body 有) | building, chat, board×2, unit, invite(redeem) |
| POST (인증, body 無) | invite(issue) |
| PATCH (인증, body 有) | auth×2 (updateProfile, changePassword) |
| PATCH (인증, body 無) | notification×2 (markOneRead, markAllRead) |
| POST (비인증, body 有) | auth (signup, login) |
| DELETE / PUT | **사용처 없음** |

## 결정 사항

채택하지 않은 대안과 사유까지 기록한다(미래의 나/리뷰어용).

- **채택: 함수형 verb 헬퍼 추가 (A안)**. 기존 `authGet`과 1:1 대칭으로 확장.
- **반려: 옵션 객체 단일 진입점(B안)** — 호출부가 길어지고 `authGet` 대칭이 깨짐.
- **반려: 토큰 바인딩 클래스 / `HttpClient`(C안)** — 토큰 주입 반복·인터셉터·응집감을
  주지만, 도메인 함수마다 `client` 인스턴스를 인자로 넘겨야 해(약 30개 호출부 마이그레이션)
  부담이 크고, SSR(App Router) 환경에서 모듈 싱글톤 시 **요청 간 토큰 누수** 위험,
  클래스 메서드 묶음으로 인한 트리쉐이킹 손해가 있다. 사용자가 "api마다 client를
  넘기는 게 싫다"고 명시해 반려.
- **errorMap 기본값 `{}`**, 자동 401 병합 없음. 호출부가 상태코드 메시지를 명시한다.
  미지정 시 `call`의 공통 fallback(`MESSAGES.common.requestFailed`)을 사용.
- **DELETE/PUT 헬퍼는 만들지 않는다(YAGNI)** — 현재 사용처 없음.

## 설계

### `lib/api/client.ts` 변경

```ts
// errorMap을 선택 인자로 (invite 등에서 {} 명시하던 것 제거)
export async function call<T>(
  path: string,
  init: RequestInit,
  errorMap: Record<number, string> = {},
): Promise<T> {
  /* 기존 구현 유지 */
}

// 비인증 POST — signup, login
export function post<T>(
  path: string,
  body: unknown,
  errorMap: Record<number, string> = {},
) {
  return call<T>(path, { method: "POST", body: JSON.stringify(body) }, errorMap);
}

// 인증 POST — body 선택(없는 요청도 동일 헬퍼로 커버)
export function authPost<T>(
  path: string,
  token: string,
  body?: unknown,
  errorMap: Record<number, string> = {},
) {
  return call<T>(path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  }, errorMap);
}

// 인증 PATCH — body 선택(notification처럼 body 없는 요청 커버)
export function authPatch<T>(
  path: string,
  token: string,
  body?: unknown,
  errorMap: Record<number, string> = {},
) {
  return call<T>(path, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  }, errorMap);
}
```

- `authGet`은 기존 동작(401 하드코딩 메시지) 그대로 유지한다.
- `body !== undefined` 스프레드로 body 없는 요청에서 `body` 키가 빠지게 한다.

### 도메인 모듈 리팩토링

호출부 시그니처는 **변경하지 않는다**(token을 계속 인자로 받음). 내부 구현만 헬퍼로 교체.

```ts
// auth.ts
export const backendSignup = (email, name, password, role) =>
  post<{ id: string; email: string; role: string }>("/auth/signup",
    { email, name, password, role },
    { 400: MESSAGES.form.invalidInput, 409: MESSAGES.auth.emailInUse });

export const backendLogin = (email, password) =>
  post<{ accessToken: string }>("/auth/login",
    { email, password },
    { 401: MESSAGES.auth.invalidCredentials });

export const backendUpdateProfile = (t, body: { name: string }) =>
  authPatch<Profile>("/auth/profile", t, body);

export const backendChangePassword = (t, body) =>
  authPatch<{ ok: true }>("/auth/password", t, body,
    { 401: MESSAGES.settings.wrongCurrentPassword });
```

같은 방식으로 building, chat, board, unit, invite, notification의 인증 mutation을
`authPost` / `authPatch`로 치환한다.

## 테스트 (TDD, Vitest)

`client.ts`는 로직 모듈이라 테스트 필수. `global.fetch`를 mock해서 검증:

- `post`: method=POST, body가 `JSON.stringify`된 값, Authorization 헤더 없음.
- `authPost(body 有)`: method=POST, `Authorization: Bearer <token>`, body 직렬화.
- `authPost(body 無)`: `body` 키가 init에 존재하지 않음.
- `authPatch(body 有/無)`: 위와 동일하게 method=PATCH 기준.
- `errorMap` 매칭 시 해당 메시지로 `ApiError(status)` throw, 미매칭 시 공통 fallback.

기존 `lib/api.test.ts`, `lib/chat-api.test.ts`는 시그니처 미변경이라 그대로 통과해야 한다.

## 성공 기준

- [ ] 도메인 파일에서 `method:`/`Authorization`/`JSON.stringify` 직접 사용이 사라짐
      (`grep`으로 `lib/api/*.ts`(client 제외) 확인).
- [ ] `npm run test` 통과 (신규 client 헬퍼 테스트 포함).
- [ ] `npm run build` · `npm run lint` 통과.
- [ ] 호출부(약 30곳) 시그니처 무변경 → app/ 수정 불필요.

## 영향 범위

- 수정: `lib/api/client.ts`, `lib/api/{auth,building,chat,board,unit,invite,notification}.ts`
- 신규: `client.ts` 헬퍼 테스트
- 무변경: `app/**` 호출부, `lib/api/{lease,index}.ts`
