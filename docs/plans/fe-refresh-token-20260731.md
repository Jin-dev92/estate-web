# M15 리프레시 토큰 FE 연동 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 액세스 토큰 수명이 15분으로 줄어든 백엔드에 맞춰, 사용자가 만료를 체감하지 않도록 리프레시 토큰 저장·자동 갱신·서버 세션 폐기를 프론트엔드에 연결합니다.

**Architecture:** 갱신은 **`proxy.ts`(구 `middleware.ts`) 한 곳**에서만 일어납니다. 액세스 쿠키가 없고 리프레시 쿠키만 남은 요청을 잡아 `POST /auth/refresh`를 호출하고, 새 토큰 쌍을 (1) `request.cookies`에 심어 **이번 요청의 렌더 코드**가 즉시 쓰게 하고 (2) `response.cookies`에 심어 브라우저가 다음 요청부터 쓰게 합니다. 갱신 호출은 리프레시 토큰 값을 키로 하는 프로세스 내 single-flight로 합칩니다.

**Tech Stack:** Next.js 16.2.9 (App Router), TypeScript, Vitest(단위), Playwright(E2E)

---

## 배경 — 왜 proxy 한 곳인가

이 계획을 실행하는 사람이 알아야 할 전제입니다. 배경 지식을 전제하지 않고 씁니다.

### 용어

- **액세스 토큰**: 백엔드 API를 부를 때 `Authorization: Bearer <토큰>` 헤더에 담는 단기 인증 수단. 이제 수명이 **15분**입니다.
- **리프레시 토큰**: 액세스 토큰이 만료됐을 때 새 토큰을 받아오는 데만 쓰는 장기 자격증명. 수명 **14일**.
- **회전(rotation)**: 갱신할 때마다 리프레시 토큰도 **새 값으로 바뀌는** 정책. 옛 토큰은 즉시 소비 처리됩니다.
- **토큰 가족(family)**: 한 번의 로그인에서 회전으로 파생된 리프레시 토큰들의 집합. 침해가 감지되면 가족 전체가 폐기됩니다.
- **BFF(Backend For Frontend)**: 브라우저가 백엔드를 직접 부르지 않고 Next 서버를 경유하는 구조. 이 레포는 이미 이 구조라서 토큰이 `httpOnly` 쿠키에 있고 브라우저 JS는 토큰을 볼 수 없습니다.
- **single-flight**: 같은 작업 요청이 동시에 여러 개 들어와도 실제 실행은 한 번만 하고 결과를 공유하는 기법.

### 제약 1 — Server Component에서는 쿠키를 쓸 수 없다

`getToken()`을 쓰는 곳이 26군데인데 대부분이 Server Component(`app/(app)/**/page.tsx`, `layout.tsx`)입니다. App Router에서 `cookies().set()`은 Server Action과 Route Handler에서만 허용되고 **Server Component 렌더 중에는 호출할 수 없습니다.** 따라서 `lib/api/client.ts`에서 401을 잡아 갱신에 성공해도 새 토큰을 쿠키에 심을 경로가 없습니다.

`proxy.ts`는 이 제약을 받지 않습니다. 요청이 렌더에 도달하기 **전에** 실행되고, 응답 쿠키를 설정할 수 있습니다.

### 제약 2 — Next 16에서 `middleware`는 deprecated

`node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md:625` 확인 결과:

- `middleware` 파일명·명명 export는 deprecated이고 **`proxy`로 개명**됐습니다.
- **`proxy`의 런타임은 `nodejs` 고정**이며 변경할 수 없습니다. `edge`가 필요하면 `middleware`를 유지해야 합니다.

`nodejs` 런타임 고정은 이 작업에 유리합니다. 모듈 레벨 상태(single-flight 맵)와 `process.env` 접근이 예측 가능해집니다. 현재 `middleware.ts`는 런타임 지정이 없어 기본 `edge`로 돌고 있습니다.

### 제약 3 — 갱신 결과를 같은 요청에 전달하는 방법

`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md:384` 확인 결과, `NextResponse.next({ request: { headers } })`로 다운스트림 요청 헤더를 덮어쓸 수 있습니다(v13.0.0 이후). 쿠키는 `Cookie` 헤더에 담긴 일반 헤더이므로, `request.cookies.set()` 후 `NextResponse.next({ request })`를 반환하면 **이번 요청의 Server Component가 새 액세스 토큰을 봅니다.**

이 두 가지를 모두 해야 합니다. `response.cookies.set()`만 하면 이번 요청의 렌더는 여전히 토큰 없이 돌아 `/login`으로 튕깁니다.

### 제약 4 — 갱신을 두 번 부르면 강제 로그아웃된다 (가장 중요)

백엔드 구현(`estate-server/src/auth/application/refresh-tokens.use-case.ts`)을 직접 읽어 확인한 동작입니다. 핸드오프 문서의 서술보다 정확하므로 이쪽을 기준으로 삼습니다.

| 상황 | 백엔드 판정 | 가족 폐기 | 결과 |
|---|---|---|---|
| 이미 **소비 완료**된 토큰을 다시 제출 (`found.isUsed()`, use-case.ts:46) | 침해 신호 | **폐기됨** | 전 기기 강제 로그아웃 |
| **거의 동시**에 같은 토큰이 둘 들어와 CAS에서 진 쪽 (`markUsed` count=0, use-case.ts:90) | 판단 불가 | 폐기 안 됨 | 이 요청만 401 |
| 만료·이미 폐기된 토큰 | 침해 아님 | 폐기 안 됨 | 401 |

핵심은 **첫 번째 행**입니다. 밀리초 단위로 겹친 동시 요청은 CAS가 막아주지만(둘째 행), **갱신이 끝난 뒤에 도착한 요청**이 옛 리프레시 토큰을 제출하면 `isUsed()` 경로로 들어가 **가족이 폐기되고 사용자가 전 기기에서 로그아웃됩니다.**

브라우저는 한 페이지에서 문서 요청과 여러 `/api/*` 요청을 병렬로 보냅니다. 이들이 모두 액세스 쿠키 없이 출발하면, 하나가 갱신을 마친 직후 나머지가 옛 토큰으로 갱신을 시도합니다. **그래서 single-flight는 진행 중인 요청을 합치는 것만으로 부족하고, 완료된 결과도 짧은 시간 공유해야 합니다.** (Task 3)

### 제약 5 — proxy는 공유 모듈에 의존하지 말라고 문서가 경고한다

`proxy.md:19`: "Proxy is meant to be invoked separately of your render code and in optimized cases deployed to your CDN for fast redirect/rewrite handling, you should not attempt relying on shared modules or globals."

이 경고는 CDN/edge 분산 배포를 전제합니다. `proxy`는 `nodejs` 런타임 고정이라 단일 프로세스 안에서는 모듈 상태가 동작하지만, **인스턴스가 여러 개면 인스턴스별로만 합쳐집니다.** 이 천장을 코드 주석(`ponytail:`)으로 명시하고, 인스턴스 간 경합까지 막아야 할 때 공유 저장소 락으로 승격하는 경로를 남깁니다. 이번 범위에서는 승격하지 않습니다.

### 핸드오프의 "401 재시도 1회 제한"이 이 설계에서 사라지는 이유

핸드오프 문서는 "401을 받으면 갱신하고 원래 요청을 재시도, 재시도는 1회만"을 요구했습니다. 이는 갱신을 API 호출 계층에 두는 설계를 전제한 것입니다.

proxy 설계에서는 **재시도 자체가 발생하지 않습니다.** 액세스 쿠키의 수명을 토큰 수명과 같게 맞추면 토큰이 만료되는 시점에 쿠키도 사라지므로, 정상 흐름에서 마주치는 신호는 401이 아니라 **"액세스 쿠키 부재"**입니다. proxy는 요청이 백엔드에 닿기 전에 이를 잡아 갱신하므로, 실패한 요청을 되돌려 다시 보낼 일이 없습니다.

무한 루프 위험은 다른 방식으로 차단합니다. 갱신이 401로 실패하면 **두 쿠키를 모두 지웁니다.** 죽은 리프레시 쿠키를 남기면 다음 요청이 또 갱신을 시도해 401을 반복하기 때문입니다(Task 4에 이를 검증하는 테스트가 있습니다).

남는 빈틈은 **시계 오차나 조기 폐기로 액세스 쿠키는 살아있는데 토큰이 무효인 경우**입니다. 이때는 갱신이 트리거되지 않고 백엔드가 401을 반환하며, `app/(app)/layout.tsx:19-21`의 기존 `catch` → `/login` 리다이렉트로 처리됩니다. 사용자는 한 번 로그인을 다시 해야 하지만 데이터 손실은 없습니다. 이 빈틈을 메우려면 `client.ts`에 401 폴백을 추가해야 하는데, 제약 1(Server Component에서 쿠키 쓰기 불가) 때문에 구조가 복잡해집니다. **이번 범위에서는 메우지 않습니다** — 발생 빈도가 낮고 기존 복구 경로가 이미 있습니다.

---

## Global Constraints

프로젝트 전역 규칙입니다. 모든 태스크의 요구사항에 암묵적으로 포함됩니다.

- **`.ts` / `.tsx`만** 허용. `.js` / `.jsx` 신규 생성 금지.
- **`as any` 금지.** 불가피하면 사유 주석 필수.
- **`enum` 금지.** 닫힌 집합은 `as const` 객체 + 파생 유니온 타입.
- **index signature 금지** (필드가 명확한 경우).
- **매직 스트링 금지.** 쿠키명·역할·내부 API 경로는 `lib/constants.ts`, 사용자 노출 문구는 `lib/messages.ts`. 같은 문자열이 2곳 이상 쓰이면 즉시 상수화.
- **페이지 라우트**는 `PAGE_ROUTES`, **내부 API 경로**는 `API_ROUTES`를 쓴다. `href`/`redirect`/`router.push`/`fetch`에 경로 리터럴 금지.
- **민감 키를 `NEXT_PUBLIC_`에 넣지 않는다.** 리프레시 토큰은 `httpOnly` 쿠키에만 둔다.
- **버전별 API는 추측하지 말고** `node_modules/next/dist/docs/`로 확인한다.
- **커밋 메시지**: `[M15]{기능}: {한글 설명}` 형식, 본문 한글, 끝에 `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **각 태스크 검증에 lint를 반드시 포함한다.** (이전 BE 세션에서 빠뜨려 3개 태스크에 12건이 누적된 전례가 있음)
- 검증 명령: `pnpm test`(Vitest) · `pnpm lint` · `pnpm typecheck` · `pnpm e2e`(Playwright)

## 범위 밖 (건드리지 않는다)

- **세션 관리 화면**(`GET /auth/sessions`, `DELETE /auth/sessions/:familyId`, `POST /auth/logout-all`). 사용자가 만들지 않기로 결정했습니다. 이 세 엔드포인트는 FE 소비자 없이 남습니다 — 결함이 아니라 의도된 범위 결정입니다.
- 액세스 토큰의 `fam` 클레임. 위 화면용이었지만 제거하면 BE를 다시 건드려야 하므로 그대로 둡니다.
- 백엔드 코드 일체. BE는 `fd8adfb`로 머지 완료입니다.

---

## 파일 구조

각 파일의 책임을 먼저 확정합니다. 태스크 분해는 이 구조를 따릅니다.

| 파일 | 상태 | 책임 |
|---|---|---|
| `lib/constants.ts` | 수정 | 쿠키 이름·수명 단일 출처 (`REFRESH_COOKIE`, `ACCESS_COOKIE_MAX_AGE`, `REFRESH_COOKIE_MAX_AGE`) |
| `lib/session.ts` | 수정 | 쿠키 읽기/쓰기/삭제. 토큰 쌍을 한 단위로 다룸 |
| `lib/api/auth.ts` | 수정 | `TokenPair` 타입, `backendRefresh`, `backendLogout` 추가. `backendLogin` 반환 타입 확장 |
| `lib/api/kakao.ts` | 수정 | 카카오 응답 타입에 `refreshToken` 반영 |
| `lib/refresh.ts` | **신규** | single-flight 갱신. 진행 중 요청 합치기 + 완료 결과 짧은 공유 |
| `proxy.ts` | **신규**(`middleware.ts` 개명) | 갱신 지점. 인증 리다이렉트 유지 |
| `middleware.ts` | 삭제 | `proxy.ts`로 개명 |
| `app/api/session/route.ts` | 수정 | 로그인 시 토큰 쌍 심기 / 로그아웃 시 BE 세션 폐기 |
| `app/api/session/signup/route.ts` | 수정 | 가입 시 토큰 쌍 심기 |
| `app/api/auth/kakao/route.ts` | 수정 | 카카오 로그인 시 토큰 쌍 심기(유니온 분기) |
| `app/api/auth/kakao/complete/route.ts` | 수정 | 카카오 온보딩 완료 시 토큰 쌍 심기 |
| `components/settings/password-form.tsx` | 수정 | 비밀번호 변경 성공 후 로그인 화면으로 |
| `lib/session.test.ts` | 수정 | 쿠키 옵션·수명 테스트 확장 |
| `lib/refresh.test.ts` | **신규** | single-flight 동작 테스트 |
| `proxy.test.ts` | **신규** | 갱신 배선·리다이렉트 테스트 |
| `e2e/mock-be/server.ts` | 수정 | `/auth/refresh`·`/auth/logout` 목 응답, 로그인 응답에 `refreshToken` |
| `e2e/fixtures/e2e-constants.ts` | 수정 | 리프레시 토큰 E2E 결합 상수 |
| `e2e/tests/auth-refresh.spec.ts` | **신규** | 액세스 쿠키 만료 → 자동 갱신 회귀 테스트 |

**변경하지 않는 파일:** `lib/api/client.ts`(갱신을 여기 두지 않습니다 — 제약 1), `app/(app)/**/page.tsx`·`layout.tsx`(이미 `getToken()` null이면 `/login`으로 리다이렉트하는 게이트가 있어 그대로 두면 됩니다), `app/api/**` 중 위 표에 없는 Route Handler(액세스 쿠키가 proxy에서 이미 갱신되어 도착합니다).

---

### Task 1: 쿠키 계층 — 리프레시 쿠키와 수명

액세스 쿠키의 `maxAge`가 아직 1시간입니다(`lib/session.ts:16`에 `// access token 수명에 맞춰 후속 조정` 주석이 예고). 이 태스크에서 15분으로 내리고 리프레시 쿠키를 추가합니다.

**리프레시 쿠키의 `path` 결정:** `path: "/"`로 둡니다. 갱신 라우트에서만 필요하니 좁힐 여지가 있어 보이지만, **`proxy`가 모든 경로에서 이 쿠키를 읽어야** 갱신이 동작합니다. `path`를 좁히면 좁힌 경로 밖의 요청에는 쿠키가 실리지 않아 갱신이 불가능해집니다. `httpOnly`라 브라우저 JS가 못 읽으므로 전송 범위를 좁혀 얻는 실익이 작습니다.

**Files:**
- Modify: `lib/constants.ts:1-2` (쿠키 상수 절)
- Modify: `lib/session.ts` (전체)
- Test: `lib/session.test.ts`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces:
  - `REFRESH_COOKIE: string`, `ACCESS_COOKIE_MAX_AGE: number`, `REFRESH_COOKIE_MAX_AGE: number` (from `lib/constants.ts`)
  - `sessionCookie(token: string): { name: string; value: string; options: {...} }` (기존 시그니처 유지)
  - `refreshCookie(token: string): { name: string; value: string; options: {...} }`
  - `setSessionPair(accessToken: string, refreshToken: string): Promise<void>`
  - `getRefreshToken(): Promise<string | null>`
  - `clearSession(): Promise<void>` (두 쿠키 모두 삭제로 확장)
  - `getToken(): Promise<string | null>` (기존 유지)

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`lib/session.test.ts`를 아래로 **교체**합니다(기존 테스트 케이스는 유지하고 확장).

```ts
import { sessionCookie, refreshCookie } from "@/lib/session";
import {
  SESSION_COOKIE,
  REFRESH_COOKIE,
  ACCESS_COOKIE_MAX_AGE,
  REFRESH_COOKIE_MAX_AGE,
} from "@/lib/constants";

it("httpOnly+SameSite=lax 쿠키 옵션", () => {
  const c = sessionCookie("tok");
  expect(c.name).toBe(SESSION_COOKIE);
  expect(c.value).toBe("tok");
  expect(c.options.httpOnly).toBe(true);
  expect(c.options.sameSite).toBe("lax");
});

it("액세스 쿠키 수명은 액세스 토큰 수명(15분)과 같다", () => {
  // 쿠키가 토큰보다 오래 남으면 만료된 토큰으로 BE를 불러 401을 맞는다.
  // 짧으면 멀쩡한 토큰을 버린다. 두 값은 같아야 한다.
  expect(sessionCookie("tok").options.maxAge).toBe(ACCESS_COOKIE_MAX_AGE);
  expect(ACCESS_COOKIE_MAX_AGE).toBe(60 * 15);
});

it("리프레시 쿠키도 httpOnly+SameSite=lax, 수명 14일", () => {
  const c = refreshCookie("rtok");
  expect(c.name).toBe(REFRESH_COOKIE);
  expect(c.value).toBe("rtok");
  expect(c.options.httpOnly).toBe(true);
  expect(c.options.sameSite).toBe("lax");
  expect(c.options.maxAge).toBe(REFRESH_COOKIE_MAX_AGE);
  expect(REFRESH_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 14);
});

it("리프레시 쿠키 path는 / — proxy가 모든 경로에서 읽어야 갱신이 된다", () => {
  expect(refreshCookie("rtok").options.path).toBe("/");
});

it("액세스·리프레시 쿠키 이름은 서로 다르다", () => {
  // 같으면 한쪽이 다른 쪽을 덮어써 갱신이 영구히 실패한다.
  expect(REFRESH_COOKIE).not.toBe(SESSION_COOKIE);
});
```

- [ ] **Step 2: 테스트가 실패하는 것을 확인한다**

Run: `pnpm test lib/session.test.ts`
Expected: FAIL — `refreshCookie`, `REFRESH_COOKIE`, `ACCESS_COOKIE_MAX_AGE`, `REFRESH_COOKIE_MAX_AGE` 가 export되지 않아 import 에러

- [ ] **Step 3: 상수를 추가한다**

`lib/constants.ts`의 1-2줄을 아래로 교체합니다.

```ts
/** httpOnly 세션(액세스 토큰) 쿠키 이름 (서버 라우트·proxy 공유 단일 출처) */
export const SESSION_COOKIE = "session";

/** httpOnly 리프레시 토큰 쿠키 이름. 액세스 토큰 만료 시 갱신에만 쓴다. */
export const REFRESH_COOKIE = "refresh";

/**
 * 쿠키 수명(초). 백엔드 토큰 수명과 맞춘다 — 어긋나면
 * 쿠키는 있는데 토큰이 죽었거나(401), 토큰은 살았는데 쿠키가 없는(불필요한 갱신) 상태가 된다.
 * BE 기준: JWT_EXPIRES_IN=15m, 리프레시 14일.
 */
export const ACCESS_COOKIE_MAX_AGE = 60 * 15;
export const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 14;

/**
 * 세션 쿠키 옵션 빌더. `lib/session.ts`(Route Handler)와 `proxy.ts` 양쪽이 공유한다.
 *
 * 왜 여기 있는가: 갱신은 proxy에서 일어나고 로그인은 Route Handler에서 일어나는데,
 * 두 곳이 심는 쿠키의 옵션이 어긋나면 수명·전송 범위가 달라진다. `lib/session.ts`는
 * `next/headers`에 의존해 proxy에서 재사용할 수 없으므로, 순수한 옵션 부분만
 * 여기로 내려 단일 출처로 둔다. (이 파일에 함수를 두는 선례는 `kakaoAuthorizeUrl`.)
 */
export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true as const,
    // 실서비스(HTTPS)에선 secure. 단 E2E는 프로덕션 빌드를 http://localhost로 띄우는데
    // webkit은 localhost에서도 secure 쿠키를 저장하지 않아(chromium/firefox는 예외 허용)
    // 세션이 안 잡힌다. E2E_INSECURE_COOKIE=1일 때만 secure를 꺼 이 환경 아티팩트를 회피한다.
    secure: process.env.NODE_ENV === "production" && process.env.E2E_INSECURE_COOKIE !== "1",
    sameSite: "lax" as const,
    // path를 좁히지 않는다 — proxy가 모든 경로에서 리프레시 쿠키를 읽어야 갱신이 동작한다.
    path: "/",
    maxAge,
  };
}
```

- [ ] **Step 4: `lib/session.ts`를 아래 내용으로 교체한다**

```ts
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  REFRESH_COOKIE,
  ACCESS_COOKIE_MAX_AGE,
  REFRESH_COOKIE_MAX_AGE,
  cookieOptions,
} from "./constants";

export function sessionCookie(token: string) {
  return { name: SESSION_COOKIE, value: token, options: cookieOptions(ACCESS_COOKIE_MAX_AGE) };
}

export function refreshCookie(token: string) {
  return { name: REFRESH_COOKIE, value: token, options: cookieOptions(REFRESH_COOKIE_MAX_AGE) };
}

export async function setSession(token: string) {
  const c = sessionCookie(token);
  (await cookies()).set(c.name, c.value, c.options);
}

/**
 * 액세스·리프레시를 함께 심는다. 갱신은 회전이라 두 값은 항상 쌍으로 바뀐다 —
 * 한쪽만 갱신하면 다음 갱신에서 옛 리프레시 토큰을 제출해 가족이 폐기된다.
 */
export async function setSessionPair(accessToken: string, refreshToken: string) {
  const jar = await cookies();
  const a = sessionCookie(accessToken);
  const r = refreshCookie(refreshToken);
  jar.set(a.name, a.value, a.options);
  jar.set(r.name, r.value, r.options);
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

export async function getToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  return (await cookies()).get(REFRESH_COOKIE)?.value ?? null;
}
```

- [ ] **Step 5: 테스트가 통과하는 것을 확인한다**

Run: `pnpm test lib/session.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: 전체 검증**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: 전부 통과. `setSession`은 시그니처가 그대로라 기존 호출부 4곳이 깨지지 않습니다.

- [ ] **Step 7: 커밋**

```bash
git add lib/constants.ts lib/session.ts lib/session.test.ts
git commit -m "[M15]session: 리프레시 쿠키 추가 및 액세스 쿠키 수명 15분 조정

액세스 토큰 수명이 15분으로 줄어 쿠키 maxAge를 맞췄다(기존 1시간).
리프레시 쿠키는 14일, path는 / 로 둔다 — proxy가 모든 경로에서
읽어야 갱신이 동작하기 때문이다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: 백엔드 갱신·로그아웃 API 함수

`POST /auth/refresh`와 `POST /auth/logout`은 **공개 엔드포인트**입니다. 액세스 토큰이 이미 만료된 상태에서 부르는 경로라 `Authorization` 헤더가 없습니다 — 리프레시 토큰 자체가 인증 수단입니다. 그래서 `authPost`가 아니라 `post`(비인증)를 씁니다.

**Files:**
- Modify: `lib/api/auth.ts`
- Modify: `lib/api/kakao.ts`
- Test: `lib/api/auth-refresh.test.ts` (신규)

**Interfaces:**
- Consumes: `post` (from `lib/api/client.ts`, 기존)
- Produces:
  - `type TokenPair = { accessToken: string; refreshToken: string }` (from `lib/api/auth.ts`)
  - `backendLogin(email: string, password: string): Promise<TokenPair>`
  - `backendRefresh(refreshToken: string): Promise<TokenPair>`
  - `backendLogout(refreshToken: string): Promise<{ ok?: boolean }>`
  - `type KakaoLoginResult = { accessToken?: string; refreshToken?: string; onboardingToken?: string }` (from `lib/api/kakao.ts`)
  - `backendKakaoComplete(onboardingToken: string, role: SignupRole): Promise<TokenPair>`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`lib/api/auth-refresh.test.ts`를 새로 만듭니다. 기존 `lib/api/client.test.ts`의 fetch 목 패턴을 따릅니다.

```ts
import { beforeEach, vi } from "vitest";
import { backendRefresh, backendLogout } from "@/lib/api";

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

it("backendRefresh: Authorization 헤더 없이 refreshToken을 body로 POST한다", async () => {
  // /auth/refresh는 공개다 — 액세스 토큰이 만료된 뒤 부르는 경로라
  // Bearer를 붙일 토큰 자체가 없다.
  const fn = mockFetch(201, { accessToken: "a2", refreshToken: "r2" });
  const pair = await backendRefresh("r1");

  expect(pair).toEqual({ accessToken: "a2", refreshToken: "r2" });
  const [url, init] = fn.mock.calls[0];
  expect(String(url)).toContain("/auth/refresh");
  expect(init.method).toBe("POST");
  expect(JSON.parse(init.body)).toEqual({ refreshToken: "r1" });
  expect(init.headers.Authorization).toBeUndefined();
});

it("backendRefresh: 401이면 ApiError(401)를 던진다", async () => {
  // 무효 토큰과 재사용 탐지 둘 다 401이고 사용자 메시지가 같다(BE 의도 —
  // 공격자에게 내부 상태를 알리지 않는다). FE도 구분하지 않는다.
  mockFetch(401, { code: "AUTH_REFRESH_TOKEN_REUSED" });
  await expect(backendRefresh("r-stale")).rejects.toMatchObject({ status: 401 });
});

it("backendLogout: refreshToken을 body로 POST한다", async () => {
  const fn = mockFetch(201, {});
  await backendLogout("r1");

  const [url, init] = fn.mock.calls[0];
  expect(String(url)).toContain("/auth/logout");
  expect(init.method).toBe("POST");
  expect(JSON.parse(init.body)).toEqual({ refreshToken: "r1" });
});
```

- [ ] **Step 2: 테스트가 실패하는 것을 확인한다**

Run: `pnpm test lib/api/auth-refresh.test.ts`
Expected: FAIL — `backendRefresh`, `backendLogout` 가 export되지 않음

- [ ] **Step 3: `lib/api/auth.ts`를 수정한다**

`lib/api/auth.ts:6` 앞에 `TokenPair` 타입을 추가하고, `backendLogin`(13-16줄)을 교체한 뒤 파일 끝에 두 함수를 추가합니다.

```ts
/** 로그인·갱신이 함께 돌려주는 토큰 쌍. 회전 정책상 두 값은 항상 같이 바뀐다. */
export type TokenPair = { accessToken: string; refreshToken: string };
```

`backendLogin` 교체 (반환 타입만 확장):

```ts
export const backendLogin = (email: string, password: string) =>
  post<TokenPair>("/auth/login",
    { email, password },
    { 401: MESSAGES.auth.invalidCredentials });
```

파일 끝에 추가:

```ts
/**
 * 리프레시 토큰으로 새 토큰 쌍을 받는다. 공개 엔드포인트다 —
 * 액세스 토큰이 만료된 뒤 부르는 경로라 Bearer를 붙일 토큰이 없다.
 *
 * 응답의 refreshToken은 매번 새 값이다(회전). 반드시 교체 저장해야 하고,
 * 옛 토큰을 다시 제출하면 BE가 침해로 판정해 세션 가족 전체를 폐기한다.
 * 직접 부르지 말고 lib/refresh.ts의 refreshSession()을 경유한다(single-flight).
 */
export const backendRefresh = (refreshToken: string) =>
  post<TokenPair>("/auth/refresh", { refreshToken });

/** 서버 세션(리프레시 토큰 가족)을 폐기한다. 공개·멱등. */
export const backendLogout = (refreshToken: string) =>
  post<{ ok?: boolean }>("/auth/logout", { refreshToken });
```

- [ ] **Step 4: `lib/api/kakao.ts`를 수정한다**

5줄과 13-17줄을 교체합니다.

```ts
import { call } from "./client";
import { MESSAGES } from "../messages";
import type { SignupRole } from "../constants";
import type { TokenPair } from "./auth";

/**
 * 기존 유저면 토큰 쌍, 신규 유저면 onboardingToken을 준다 —
 * 둘 중 하나만 오는 유니온이므로 호출부에서 분기해야 한다.
 */
export type KakaoLoginResult = {
  accessToken?: string;
  refreshToken?: string;
  onboardingToken?: string;
};

export const backendKakaoLogin = (code: string, redirectUri: string) =>
  call<KakaoLoginResult>("/auth/kakao", {
    method: "POST",
    body: JSON.stringify({ code, redirectUri }),
  }, { 400: MESSAGES.auth.kakaoEmailRequired });

export const backendKakaoComplete = (onboardingToken: string, role: SignupRole) =>
  call<TokenPair>("/auth/kakao/complete", {
    method: "POST",
    body: JSON.stringify({ onboardingToken, role }),
  }, { 409: MESSAGES.auth.emailInUse });
```

- [ ] **Step 5: 배럴 export를 확인한다**

`lib/api/index.ts`를 읽고 `auth`·`kakao` 모듈이 `export *` 되어 있는지 확인합니다. 되어 있으면 새 함수·타입이 자동으로 `@/lib/api`에서 나옵니다. 아니면 한 줄 추가합니다.

Run: `grep -n "auth\|kakao" lib/api/index.ts`

- [ ] **Step 6: 테스트가 통과하는 것을 확인한다**

Run: `pnpm test lib/api/auth-refresh.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 7: 전체 검증**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: `pnpm typecheck`가 **실패**할 수 있습니다 — `backendLogin` 반환 타입에 `refreshToken`이 생겼지만 호출부(`app/api/session/route.ts` 등)는 아직 구조분해에서 쓰지 않습니다. 그건 타입 에러가 아니므로(사용하지 않는 필드는 문제 없음) 통과해야 합니다. 실패하면 메시지를 읽고 Task 5 범위인지 확인합니다 — Task 5 범위면 그때 고칩니다.

- [ ] **Step 8: 커밋**

```bash
git add lib/api/auth.ts lib/api/kakao.ts lib/api/index.ts lib/api/auth-refresh.test.ts
git commit -m "[M15]api: 갱신·로그아웃 백엔드 함수와 토큰 쌍 타입 추가

/auth/refresh·/auth/logout은 공개 엔드포인트라 비인증 post를 쓴다.
액세스 토큰이 만료된 뒤 부르는 경로여서 Bearer를 붙일 토큰이 없다.
카카오 응답 타입에도 refreshToken을 반영했다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: single-flight 갱신 — 이 작업의 핵심

**이 태스크가 계획 전체에서 가장 중요합니다.** 여기가 틀리면 정상 사용자가 강제 로그아웃됩니다. 위 "제약 4"를 먼저 읽으세요.

두 가지를 모두 해야 합니다.

1. **진행 중인 갱신 합치기** — 같은 리프레시 토큰으로 동시에 들어온 요청은 Promise 하나를 공유합니다.
2. **완료된 결과 짧게 공유하기** — 갱신이 끝난 **뒤에** 도착한 요청이 옛 토큰으로 BE를 다시 부르면 `isUsed()` 판정 → 가족 폐기 → 전 기기 로그아웃입니다. 결과를 TTL 동안 남겨 이 요청들도 BE를 부르지 않고 새 쌍을 받게 합니다.

1번만 구현하면 병렬 요청의 절반이 강제 로그아웃을 유발합니다. 2번이 없으면 이 태스크는 미완성입니다.

**Files:**
- Create: `lib/refresh.ts`
- Test: `lib/refresh.test.ts`

**Interfaces:**
- Consumes: `backendRefresh(refreshToken: string): Promise<TokenPair>`, `type TokenPair` (from Task 2)
- Produces: `refreshSession(refreshToken: string): Promise<TokenPair>` (from `lib/refresh.ts`)

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`lib/refresh.test.ts`를 새로 만듭니다.

```ts
import { afterEach, beforeEach, vi } from "vitest";

// backendRefresh를 목으로 갈아끼운다 — 이 테스트는 네트워크가 아니라
// "BE를 몇 번 부르는가"를 검증한다.
const backendRefresh = vi.fn();
vi.mock("@/lib/api", () => ({ backendRefresh: (t: string) => backendRefresh(t) }));

// 모듈 레벨 맵을 쓰므로 테스트마다 모듈을 새로 불러 상태를 격리한다.
async function freshRefreshSession() {
  vi.resetModules();
  const mod = await import("@/lib/refresh");
  return mod.refreshSession;
}

beforeEach(() => {
  backendRefresh.mockReset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it("동시에 들어온 같은 토큰의 갱신은 BE를 한 번만 부른다", async () => {
  // 회전 정책상 두 번 부르면 두 번째는 소비된 토큰을 제출하게 된다.
  const refreshSession = await freshRefreshSession();
  let resolve!: (v: unknown) => void;
  backendRefresh.mockReturnValue(new Promise((r) => (resolve = r)));

  const a = refreshSession("r1");
  const b = refreshSession("r1");
  const c = refreshSession("r1");
  resolve({ accessToken: "a2", refreshToken: "r2" });

  const results = await Promise.all([a, b, c]);
  expect(backendRefresh).toHaveBeenCalledTimes(1);
  expect(results).toEqual([
    { accessToken: "a2", refreshToken: "r2" },
    { accessToken: "a2", refreshToken: "r2" },
    { accessToken: "a2", refreshToken: "r2" },
  ]);
});

it("갱신이 끝난 뒤 도착한 같은 토큰도 BE를 다시 부르지 않는다", async () => {
  // 여기가 핵심이다. 진행 중 합치기만 하면 이 케이스가 BE를 다시 부르고,
  // BE는 이미 소비된 토큰의 재제출을 침해로 판정해 가족 전체를 폐기한다
  // (estate-server refresh-tokens.use-case.ts:46) = 정상 사용자 강제 로그아웃.
  const refreshSession = await freshRefreshSession();
  backendRefresh.mockResolvedValue({ accessToken: "a2", refreshToken: "r2" });

  const first = await refreshSession("r1");
  const late = await refreshSession("r1"); // 완료 후 도착

  expect(backendRefresh).toHaveBeenCalledTimes(1);
  expect(late).toEqual(first);
});

it("결과 공유는 TTL이 지나면 끝난다", async () => {
  // 무한 캐시면 14일 내내 같은 쌍을 돌려주게 되어 갱신이 멈춘다.
  const refreshSession = await freshRefreshSession();
  backendRefresh.mockResolvedValue({ accessToken: "a2", refreshToken: "r2" });

  await refreshSession("r1");
  await vi.advanceTimersByTimeAsync(60_000);
  await refreshSession("r1");

  expect(backendRefresh).toHaveBeenCalledTimes(2);
});

it("실패는 공유하지 않는다 — 다음 요청이 다시 시도할 수 있다", async () => {
  // 네트워크 순단으로 한 번 실패한 것을 TTL 동안 붙잡아두면
  // 복구 가능한 사용자를 로그인 화면으로 보낸다.
  const refreshSession = await freshRefreshSession();
  backendRefresh.mockRejectedValueOnce(new Error("network"));
  backendRefresh.mockResolvedValueOnce({ accessToken: "a2", refreshToken: "r2" });

  await expect(refreshSession("r1")).rejects.toThrow("network");
  await expect(refreshSession("r1")).resolves.toEqual({ accessToken: "a2", refreshToken: "r2" });
  expect(backendRefresh).toHaveBeenCalledTimes(2);
});

it("다른 토큰의 갱신은 서로 합쳐지지 않는다", async () => {
  // 서로 다른 세션(다른 기기·다른 사용자)이 한 프로세스를 공유한다.
  // 토큰을 키로 쓰지 않으면 A의 갱신 결과가 B에게 새는 심각한 버그가 된다.
  const refreshSession = await freshRefreshSession();
  backendRefresh.mockImplementation((t: string) =>
    Promise.resolve({ accessToken: `a-${t}`, refreshToken: `r-${t}` }),
  );

  const [a, b] = await Promise.all([refreshSession("rA"), refreshSession("rB")]);

  expect(backendRefresh).toHaveBeenCalledTimes(2);
  expect(a).toEqual({ accessToken: "a-rA", refreshToken: "r-rA" });
  expect(b).toEqual({ accessToken: "a-rB", refreshToken: "r-rB" });
});
```

- [ ] **Step 2: 테스트가 실패하는 것을 확인한다**

Run: `pnpm test lib/refresh.test.ts`
Expected: FAIL — `lib/refresh` 모듈이 없음

- [ ] **Step 3: `lib/refresh.ts`를 만든다**

```ts
import { backendRefresh } from "./api";
import type { TokenPair } from "./api";

/**
 * 갱신 결과를 공유하는 시간(ms). 갱신이 끝난 직후 도착한 병렬 요청까지 덮는다.
 *
 * 왜 필요한가: 브라우저는 한 페이지에서 문서와 여러 /api/* 요청을 병렬로 보낸다.
 * 이들이 모두 액세스 쿠키 없이 출발하면, 하나가 갱신을 마친 뒤 나머지가
 * 옛 리프레시 토큰을 제출한다. BE는 이미 소비된 토큰의 재제출을 침해로 판정해
 * 세션 가족 전체를 폐기한다(estate-server refresh-tokens.use-case.ts:46) —
 * 정상 사용자가 전 기기에서 로그아웃된다. 결과를 잠깐 남겨 그 재제출을 없앤다.
 *
 * 10초는 한 페이지 로드의 병렬 요청이 모두 도착하기에 넉넉하고,
 * 15분 액세스 토큰 수명에 비해 짧아 갱신 주기를 늘리지 않는다.
 */
const RESULT_TTL_MS = 10_000;

/**
 * 진행 중이거나 방금 끝난 갱신을 리프레시 토큰별로 보관한다.
 *
 * ponytail: 프로세스 메모리 맵이라 서버 인스턴스가 여러 개면 인스턴스별로만
 * 합쳐진다. 인스턴스 간 경합까지 막아야 하면 공유 저장소(Redis 등) 락으로
 * 승격한다. Next docs가 proxy에서 공유 모듈 의존을 권하지 않지만(proxy.md:19,
 * CDN 분산 배포 전제), proxy 런타임은 nodejs 고정이라 단일 프로세스 안에서는
 * 동작한다.
 */
const inFlight = new Map<string, Promise<TokenPair>>();

/**
 * 리프레시 토큰으로 새 토큰 쌍을 받는다. 같은 토큰의 갱신은 한 번만 실행되고
 * 결과가 공유된다(single-flight). backendRefresh를 직접 부르지 말고 이 함수를 쓴다.
 */
export function refreshSession(refreshToken: string): Promise<TokenPair> {
  const shared = inFlight.get(refreshToken);
  if (shared) return shared;

  const pending = backendRefresh(refreshToken);
  inFlight.set(refreshToken, pending);

  pending.then(
    () => {
      // 성공은 TTL 동안 남긴다(위 RESULT_TTL_MS 주석 참고).
      // unref로 타이머가 프로세스 종료를 붙잡지 않게 한다(테스트·서버리스 환경).
      const timer = setTimeout(() => inFlight.delete(refreshToken), RESULT_TTL_MS);
      timer.unref?.();
    },
    () => {
      // 실패는 즉시 비운다 — 순단으로 한 번 실패한 것을 붙잡아두면
      // 복구 가능한 사용자를 로그인 화면으로 보낸다.
      inFlight.delete(refreshToken);
    },
  );

  return pending;
}
```

- [ ] **Step 4: 테스트가 통과하는 것을 확인한다**

Run: `pnpm test lib/refresh.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 뮤테이션으로 테스트가 실제로 잡는지 확인한다**

로직이 옳아도 테스트가 회귀를 못 잡으면 의미가 없습니다. 아래 두 개를 **직접 고쳐 테스트가 실패하는지 확인하고, 반드시 원복**합니다.

1. `setTimeout(...)` 블록 전체를 `inFlight.delete(refreshToken)`로 바꾼다 → "갱신이 끝난 뒤 도착한 같은 토큰도 BE를 다시 부르지 않는다"가 FAIL해야 합니다. 안 하면 그 테스트는 무의미하므로 고칩니다.
2. `inFlight.get(refreshToken)` / `set(refreshToken, ...)`의 키를 고정 문자열 `"x"`로 바꾼다 → "다른 토큰의 갱신은 서로 합쳐지지 않는다"가 FAIL해야 합니다.

원복 후 Run: `pnpm test lib/refresh.test.ts` → PASS

- [ ] **Step 6: 전체 검증**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: 전부 통과

- [ ] **Step 7: 커밋**

```bash
git add lib/refresh.ts lib/refresh.test.ts
git commit -m "[M15]refresh: single-flight 갱신 추가

같은 리프레시 토큰의 갱신을 한 번만 실행하고 결과를 공유한다.
진행 중인 요청을 합치는 것만으로는 부족해서 완료 결과도 10초간 남긴다 —
갱신이 끝난 뒤 도착한 병렬 요청이 옛 토큰을 제출하면 BE가 재사용으로
판정해 세션 가족 전체를 폐기하고, 정상 사용자가 전 기기에서 로그아웃된다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: `middleware.ts` → `proxy.ts` 개명 + 갱신 배선

`middleware.ts`를 `proxy.ts`로 개명하고 갱신을 배선합니다. 개명이 이 태스크에 포함된 이유는 **갱신 로직의 전제조건**이기 때문입니다 — `middleware`의 기본 런타임은 `edge`이고, `proxy`는 `nodejs` 고정입니다. Task 3의 모듈 레벨 맵과 `process.env` 접근은 `nodejs`에서 예측 가능합니다.

**파일 삭제 주의:** `middleware.ts` 삭제는 `git mv`로 개명하여 처리합니다. 삭제가 필요한 다른 파일은 없습니다. **삭제 전 사용자에게 확인을 받으세요**(프로젝트 규칙).

**matcher 확장이 필수입니다.** 현재 matcher는 `/dashboard`·`/login`·`/signup`만 잡습니다. `/board`·`/chat`·`/buildings`·`/notifications`·`/settings`와 `/api/*`가 빠져 있어, 그대로 두면 그 경로에서 갱신이 일어나지 않습니다.

**PROTECTED 목록은 확장하지 않습니다.** `app/(app)/layout.tsx:11-12`가 이미 모든 앱 페이지의 게이트로 `getToken()` null이면 `/login`으로 리다이렉트합니다. proxy는 갱신만 담당하면 됩니다.

**Files:**
- Create: `proxy.ts` (from `middleware.ts` via `git mv`)
- Delete: `middleware.ts` (개명이므로 내용은 보존)
- Test: `proxy.test.ts`

**Interfaces:**
- Consumes: `refreshSession(refreshToken: string): Promise<TokenPair>` (Task 3), `SESSION_COOKIE`·`REFRESH_COOKIE`·`ACCESS_COOKIE_MAX_AGE`·`REFRESH_COOKIE_MAX_AGE` (Task 1), `PAGE_ROUTES` (기존)
- Produces: `proxy(req: NextRequest): Promise<NextResponse>`, `config` (Next가 소비)

- [ ] **Step 1: Next 16 proxy 규약을 문서로 확인한다**

추측하지 말고 읽습니다(프로젝트 규칙).

Run: `sed -n '620,665p' node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`
확인할 것: 파일명 `proxy.ts`, 명명 export `proxy`, 런타임 `nodejs` 고정.

Run: `grep -n -A25 "### Setting Headers" node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
확인할 것: `NextResponse.next({ request: { headers } })`로 다운스트림 요청 헤더를 덮어쓰는 방법.

- [ ] **Step 2: 실패하는 테스트를 쓴다**

`proxy.test.ts`를 프로젝트 루트에 만듭니다.

```ts
import { beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  REFRESH_COOKIE,
  PAGE_ROUTES,
} from "@/lib/constants";

const refreshSession = vi.fn();
vi.mock("@/lib/refresh", () => ({ refreshSession: (t: string) => refreshSession(t) }));

async function freshProxy() {
  vi.resetModules();
  const mod = await import("@/proxy");
  return mod.proxy;
}

// 쿠키를 실어 요청을 만든다. 액세스 토큰이 없는 상태를 표현하려면 access를 생략한다.
function makeReq(path: string, cookies: { access?: string; refresh?: string } = {}) {
  const req = new NextRequest(new URL(`http://localhost${path}`));
  if (cookies.access) req.cookies.set(SESSION_COOKIE, cookies.access);
  if (cookies.refresh) req.cookies.set(REFRESH_COOKIE, cookies.refresh);
  return req;
}

beforeEach(() => {
  refreshSession.mockReset();
});

it("액세스 쿠키가 있으면 갱신하지 않는다", async () => {
  const proxy = await freshProxy();
  await proxy(makeReq(PAGE_ROUTES.dashboard, { access: "a1", refresh: "r1" }));
  expect(refreshSession).not.toHaveBeenCalled();
});

it("액세스 없고 리프레시만 있으면 갱신한다", async () => {
  const proxy = await freshProxy();
  refreshSession.mockResolvedValue({ accessToken: "a2", refreshToken: "r2" });

  await proxy(makeReq(PAGE_ROUTES.dashboard, { refresh: "r1" }));

  expect(refreshSession).toHaveBeenCalledWith("r1");
});

it("갱신 성공 시 새 토큰 쌍을 응답 쿠키에 심는다", async () => {
  const proxy = await freshProxy();
  refreshSession.mockResolvedValue({ accessToken: "a2", refreshToken: "r2" });

  const res = await proxy(makeReq(PAGE_ROUTES.dashboard, { refresh: "r1" }));

  expect(res.cookies.get(SESSION_COOKIE)?.value).toBe("a2");
  // 회전한 리프레시 토큰도 교체 저장해야 한다 — 안 하면 다음 갱신에서
  // 옛 토큰을 제출해 가족이 폐기된다.
  expect(res.cookies.get(REFRESH_COOKIE)?.value).toBe("r2");
});

it("갱신 성공 시 이번 요청의 렌더 코드도 새 액세스 토큰을 본다", async () => {
  // 응답 쿠키만 심으면 이번 요청의 Server Component는 여전히 토큰이 없어
  // /login으로 튕긴다. request 쿠키까지 덮어써야 15분 만료가 사용자에게
  // 보이지 않는다.
  const proxy = await freshProxy();
  refreshSession.mockResolvedValue({ accessToken: "a2", refreshToken: "r2" });

  const req = makeReq(PAGE_ROUTES.dashboard, { refresh: "r1" });
  await proxy(req);

  expect(req.cookies.get(SESSION_COOKIE)?.value).toBe("a2");
});

it("갱신 실패 시 두 쿠키를 모두 지운다", async () => {
  // 죽은 리프레시 쿠키를 남기면 매 요청마다 갱신을 시도해 401을 반복한다.
  const proxy = await freshProxy();
  refreshSession.mockRejectedValue(Object.assign(new Error("401"), { status: 401 }));

  const res = await proxy(makeReq(PAGE_ROUTES.dashboard, { refresh: "r-dead" }));

  expect(res.cookies.get(SESSION_COOKIE)?.value).toBeFalsy();
  expect(res.cookies.get(REFRESH_COOKIE)?.value).toBeFalsy();
});

it("갱신 실패 시 보호 경로는 로그인으로 보낸다", async () => {
  const proxy = await freshProxy();
  refreshSession.mockRejectedValue(Object.assign(new Error("401"), { status: 401 }));

  const res = await proxy(makeReq(PAGE_ROUTES.dashboard, { refresh: "r-dead" }));

  expect(res.status).toBe(307);
  expect(res.headers.get("location")).toContain(PAGE_ROUTES.login);
});

it("쿠키가 아예 없으면 갱신을 시도하지 않는다", async () => {
  // 비로그인 방문자다. 부를 리프레시 토큰이 없다.
  const proxy = await freshProxy();
  await proxy(makeReq(PAGE_ROUTES.dashboard));
  expect(refreshSession).not.toHaveBeenCalled();
});

it("로그인·가입 경로에서는 갱신하지 않는다", async () => {
  // 인증을 새로 시작하는 경로다. 여기서 갱신이 돌면 로그아웃 직후
  // 남은 쿠키로 세션이 되살아나는 혼란이 생긴다.
  const proxy = await freshProxy();
  await proxy(makeReq(PAGE_ROUTES.login, { refresh: "r1" }));
  expect(refreshSession).not.toHaveBeenCalled();
});

it("세션이 있으면 로그인 페이지에서 대시보드로 보낸다(기존 동작 유지)", async () => {
  const proxy = await freshProxy();
  const res = await proxy(makeReq(PAGE_ROUTES.login, { access: "a1" }));
  expect(res.status).toBe(307);
  expect(res.headers.get("location")).toContain(PAGE_ROUTES.dashboard);
});

it("세션이 없으면 보호 경로에서 로그인으로 보낸다(기존 동작 유지)", async () => {
  const proxy = await freshProxy();
  const res = await proxy(makeReq(PAGE_ROUTES.dashboard));
  expect(res.status).toBe(307);
  expect(res.headers.get("location")).toContain(PAGE_ROUTES.login);
});
```

- [ ] **Step 3: 테스트가 실패하는 것을 확인한다**

Run: `pnpm test proxy.test.ts`
Expected: FAIL — `@/proxy` 모듈이 없음

- [ ] **Step 4: 파일을 개명한다**

**사용자에게 `middleware.ts` 개명 확인을 받은 뒤** 실행합니다.

```bash
git mv middleware.ts proxy.ts
```

- [ ] **Step 5: `proxy.ts`를 아래 내용으로 교체한다**

```ts
import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  REFRESH_COOKIE,
  ACCESS_COOKIE_MAX_AGE,
  REFRESH_COOKIE_MAX_AGE,
  PAGE_ROUTES,
  cookieOptions,
} from "@/lib/constants";
import { refreshSession } from "@/lib/refresh";

const AUTH_PAGES = [PAGE_ROUTES.login, PAGE_ROUTES.signup];
const PROTECTED = [PAGE_ROUTES.dashboard];

// 인증을 새로 시작하는 경로. 여기서 갱신이 돌면 로그아웃 직후 남은 쿠키로
// 세션이 되살아나는 혼란이 생긴다. 갱신만 건너뛰고 리다이렉트 판정은 유지한다.
const NO_REFRESH_PREFIXES = [PAGE_ROUTES.login, PAGE_ROUTES.signup, "/api/session", "/api/auth"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const access = req.cookies.get(SESSION_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;

  // 액세스 토큰이 만료되면 쿠키도 같이 사라진다(수명을 맞춰뒀다).
  // 그래서 정상 흐름에서 마주치는 신호는 401이 아니라 "액세스 쿠키 부재"다.
  const needsRefresh =
    !access && Boolean(refresh) && !NO_REFRESH_PREFIXES.some((p) => pathname.startsWith(p));

  if (needsRefresh) {
    try {
      const pair = await refreshSession(refresh!);

      // 이번 요청의 Server Component·Route Handler가 새 토큰을 보게 한다.
      // 이걸 빼면 응답 쿠키는 심겼는데 이번 렌더는 토큰 없이 돌아 /login으로 튕긴다.
      req.cookies.set(SESSION_COOKIE, pair.accessToken);
      req.cookies.set(REFRESH_COOKIE, pair.refreshToken);

      const res = NextResponse.next({ request: { headers: req.headers } });
      // 브라우저가 다음 요청부터 쓸 쿠키. 회전했으므로 리프레시도 교체해야 한다.
      res.cookies.set(SESSION_COOKIE, pair.accessToken, cookieOptions(ACCESS_COOKIE_MAX_AGE));
      res.cookies.set(REFRESH_COOKIE, pair.refreshToken, cookieOptions(REFRESH_COOKIE_MAX_AGE));
      return res;
    } catch {
      // 무효·재사용 탐지·만료 모두 여기로 온다(BE가 의도적으로 401 하나로 묶었다).
      // 죽은 쿠키를 남기면 매 요청마다 갱신을 시도해 401을 반복하므로 지운다.
      const res = PROTECTED.some((p) => pathname.startsWith(p))
        ? NextResponse.redirect(new URL(PAGE_ROUTES.login, req.url))
        : NextResponse.next();
      res.cookies.delete(SESSION_COOKIE);
      res.cookies.delete(REFRESH_COOKIE);
      return res;
    }
  }

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (PROTECTED.some((p) => pathname.startsWith(p)) && !hasSession) {
    return NextResponse.redirect(new URL(PAGE_ROUTES.login, req.url));
  }
  if (AUTH_PAGES.some((p) => pathname.startsWith(p)) && hasSession) {
    return NextResponse.redirect(new URL(PAGE_ROUTES.dashboard, req.url));
  }
  return NextResponse.next();
}

// 갱신이 모든 앱 경로와 내부 API에서 일어나야 하므로 정적 자산만 제외하고 전부 잡는다.
// 기존 matcher(/dashboard·/login·/signup)로는 /board·/chat·/api/* 에서 갱신이 안 된다.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
```

- [ ] **Step 6: 테스트가 통과하는 것을 확인한다**

Run: `pnpm test proxy.test.ts`
Expected: PASS (10 tests)

`vitest.config.ts`에 `include` 패턴이 없어 기본값(`**/*.{test,spec}.?(c|m)[jt]s?(x)`, `e2e/**` 제외)이 적용되므로 루트의 `proxy.test.ts`가 잡힙니다. 설정 변경은 필요하지 않습니다.

- [ ] **Step 7: 뮤테이션으로 테스트가 실제로 잡는지 확인한다**

아래를 직접 고쳐 테스트가 실패하는지 확인하고 **반드시 원복**합니다.

1. `req.cookies.set(...)` 두 줄을 지운다 → "이번 요청의 렌더 코드도 새 액세스 토큰을 본다"가 FAIL해야 합니다.
2. `res.cookies.set(REFRESH_COOKIE, ...)` 줄을 지운다 → "새 토큰 쌍을 응답 쿠키에 심는다"가 FAIL해야 합니다.
3. `catch` 블록의 `res.cookies.delete(...)` 두 줄을 지운다 → "갱신 실패 시 두 쿠키를 모두 지운다"가 FAIL해야 합니다.

원복 후 Run: `pnpm test proxy.test.ts` → PASS

- [ ] **Step 8: deprecated 경고가 사라진 것을 확인한다**

Run: `pnpm build`
Expected: 빌드 성공. `middleware` deprecation 경고가 나오지 않아야 합니다. 경고가 남으면 개명이 덜 된 곳(파일명 또는 export 이름)을 찾습니다.

- [ ] **Step 9: 전체 검증**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: 전부 통과

- [ ] **Step 10: 커밋**

```bash
git add proxy.ts proxy.test.ts
git commit -m "[M15]proxy: middleware를 proxy로 개명하고 토큰 자동 갱신 배선

액세스 쿠키가 없고 리프레시 쿠키만 남은 요청에서 갱신을 수행한다.
새 토큰 쌍을 request 쿠키(이번 요청의 렌더용)와 response 쿠키(다음 요청용)
양쪽에 심는다 — 응답만 심으면 이번 렌더는 토큰 없이 돌아 /login으로 튕긴다.

Next 16에서 middleware는 deprecated이고 proxy로 개명됐다. proxy는 런타임이
nodejs 고정이라 single-flight 맵과 process.env 접근이 예측 가능해진다.
matcher도 확장했다 — 기존 범위로는 /board·/chat·/api/* 에서 갱신이 안 된다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: 로그인·가입·카카오 경로가 토큰 쌍을 심도록

토큰을 심는 지점이 4개입니다. 전부 `setSession(accessToken)`만 부르고 있어 리프레시 토큰이 버려집니다.

**카카오 경로 주의:** `POST /auth/kakao`는 기존 유저면 토큰 쌍, 신규면 `{ onboardingToken }`을 줍니다. 유니온이라 분기가 필요합니다.

**Files:**
- Modify: `app/api/session/route.ts:9-10`
- Modify: `app/api/session/signup/route.ts:11,15`
- Modify: `app/api/auth/kakao/route.ts:9-14`
- Modify: `app/api/auth/kakao/complete/route.ts:8-9`

**Interfaces:**
- Consumes: `setSessionPair(accessToken, refreshToken)` (Task 1), `TokenPair`·`backendLogin`·`KakaoLoginResult` (Task 2)
- Produces: 없음 (라우트는 최종 소비자)

- [ ] **Step 1: `app/api/session/route.ts`의 POST 본문을 고친다**

9-10줄을 교체합니다.

```ts
    const { accessToken, refreshToken } = await backendLogin(email, password);
    await setSessionPair(accessToken, refreshToken);
```

import도 함께 고칩니다(3줄).

```ts
import { setSessionPair, clearSession } from "@/lib/session";
```

- [ ] **Step 2: `app/api/session/signup/route.ts`를 고친다**

11줄과 15줄을 교체합니다.

```ts
    const { accessToken, refreshToken } = await backendLogin(email, password); // 2) 자동 로그인(토큰 미발급 대응)
```

```ts
    await setSessionPair(accessToken, refreshToken);            // 4) httpOnly 쿠키
```

import(3줄):

```ts
import { setSessionPair } from "@/lib/session";
```

- [ ] **Step 3: `app/api/auth/kakao/route.ts`를 고친다**

유니온 분기를 유지하면서 토큰 쌍을 심습니다. 10-14줄을 교체합니다.

```ts
    // 기존 유저면 토큰 쌍, 신규 유저면 onboardingToken이 온다(유니온).
    if (result.accessToken && result.refreshToken) {
      await setSessionPair(result.accessToken, result.refreshToken);
      return NextResponse.json({ next: KAKAO_NEXT.DASHBOARD });
    }
    return NextResponse.json({ next: KAKAO_NEXT.ROLE_SELECT, onboardingToken: result.onboardingToken });
```

import(3줄):

```ts
import { setSessionPair } from "@/lib/session";
```

- [ ] **Step 4: `app/api/auth/kakao/complete/route.ts`를 고친다**

8-9줄을 교체합니다.

```ts
    const { accessToken, refreshToken } = await backendKakaoComplete(onboardingToken, role);
    await setSessionPair(accessToken, refreshToken);
```

import(3줄):

```ts
import { setSessionPair } from "@/lib/session";
```

- [ ] **Step 5: `setSession`이 아직 쓰이는지 확인한다**

Run: `grep -rn --include='*.ts' --include='*.tsx' 'setSession\b' app lib components`
Expected: 호출부가 없어야 합니다. 없으면 `lib/session.ts`에서 `setSession`을 지웁니다(죽은 코드). 남아 있으면 그 호출부가 리프레시 토큰을 버리고 있다는 뜻이니 왜 남았는지 판단합니다.

지울 때는 `lib/session.ts`에서 아래 블록을 삭제합니다.

```ts
export async function setSession(token: string) {
  const c = sessionCookie(token);
  (await cookies()).set(c.name, c.value, c.options);
}
```

- [ ] **Step 6: 검증**

Run: `pnpm test && pnpm lint && pnpm typecheck && pnpm build`
Expected: 전부 통과. `typecheck`가 `refreshToken`이 없다고 하면 Task 2의 반환 타입이 덜 반영된 것입니다.

- [ ] **Step 7: 커밋**

```bash
git add app/api/session/route.ts app/api/session/signup/route.ts app/api/auth/kakao/route.ts app/api/auth/kakao/complete/route.ts lib/session.ts
git commit -m "[M15]auth: 로그인·가입·카카오 경로가 토큰 쌍을 쿠키에 심도록

네 경로 모두 accessToken만 저장하고 refreshToken을 버리고 있었다.
카카오 로그인은 기존 유저(토큰 쌍)·신규 유저(onboardingToken) 유니온이라
분기를 유지했다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: 로그아웃 — 서버 세션도 폐기

현재 `DELETE /api/session`은 쿠키만 지웁니다. 리프레시 토큰이 서버에 **14일간 살아있게** 됩니다. 백엔드 `POST /auth/logout`을 불러 세션 가족을 폐기해야 합니다.

**Files:**
- Modify: `app/api/session/route.ts:18-21` (DELETE)
- Test: `app/api/session/route.test.ts` (기존 관례가 co-location입니다 — `lib/session.test.ts`, `lib/api/client.test.ts`. `test/`에는 헬퍼만 둡니다)

**Interfaces:**
- Consumes: `backendLogout(refreshToken)` (Task 2), `getRefreshToken()`·`clearSession()` (Task 1)
- Produces: 없음

- [ ] **Step 1: 실패하는 테스트를 쓴다**

Route Handler를 직접 부르는 테스트입니다. `next/headers`의 `cookies()`를 목으로 갈아끼웁니다.

```ts
import { beforeEach, vi } from "vitest";

const backendLogout = vi.fn();
const clearSession = vi.fn();
const getRefreshToken = vi.fn();

vi.mock("@/lib/api", () => ({
  backendLogout: (t: string) => backendLogout(t),
  ApiError: class ApiError extends Error { status = 500; },
}));
vi.mock("@/lib/session", () => ({
  clearSession: () => clearSession(),
  getRefreshToken: () => getRefreshToken(),
  setSessionPair: vi.fn(),
}));

async function freshDelete() {
  vi.resetModules();
  const mod = await import("@/app/api/session/route");
  return mod.DELETE;
}

beforeEach(() => {
  backendLogout.mockReset();
  clearSession.mockReset();
  getRefreshToken.mockReset();
});

it("로그아웃은 서버 세션을 폐기하고 쿠키를 지운다", async () => {
  // 쿠키만 지우면 리프레시 토큰이 14일간 서버에 살아있다.
  const DELETE = await freshDelete();
  getRefreshToken.mockResolvedValue("r1");
  backendLogout.mockResolvedValue({});

  const res = await DELETE();

  expect(backendLogout).toHaveBeenCalledWith("r1");
  expect(clearSession).toHaveBeenCalled();
  expect(res.status).toBe(200);
});

it("BE 폐기가 실패해도 쿠키는 지운다", async () => {
  // 여기서 쿠키를 남기면 사용자는 로그아웃 버튼을 눌렀는데도 로그인 상태로
  // 남는다. 서버 세션 폐기 실패보다 이게 더 나쁜 결과다.
  const DELETE = await freshDelete();
  getRefreshToken.mockResolvedValue("r1");
  backendLogout.mockRejectedValue(new Error("network"));

  const res = await DELETE();

  expect(clearSession).toHaveBeenCalled();
  expect(res.status).toBe(200);
});

it("리프레시 쿠키가 없으면 BE를 부르지 않고 쿠키만 지운다", async () => {
  const DELETE = await freshDelete();
  getRefreshToken.mockResolvedValue(null);

  const res = await DELETE();

  expect(backendLogout).not.toHaveBeenCalled();
  expect(clearSession).toHaveBeenCalled();
  expect(res.status).toBe(200);
});
```

- [ ] **Step 2: 테스트가 실패하는 것을 확인한다**

Run: `pnpm test app/api/session/route.test.ts`
Expected: FAIL — `backendLogout`이 호출되지 않음(현재 DELETE는 `clearSession`만 부름)

- [ ] **Step 3: `app/api/session/route.ts`의 DELETE를 교체한다**

```ts
export async function DELETE() {
  // 서버 세션(리프레시 토큰 가족)을 먼저 폐기한다. 이걸 빼면 쿠키만 지워지고
  // 리프레시 토큰이 14일간 서버에 살아있다.
  const refresh = await getRefreshToken();
  if (refresh) {
    try {
      await backendLogout(refresh);
    } catch {
      // BE 폐기 실패로 로그아웃을 막지 않는다 — 쿠키를 남기면 사용자는
      // 버튼을 눌렀는데도 로그인 상태로 남는다. BE 세션은 14일 뒤 만료된다.
    }
  }
  await clearSession();
  return NextResponse.json({ ok: true });
}
```

import를 고칩니다(2-3줄).

```ts
import { backendLogin, backendLogout, ApiError } from "@/lib/api";
import { setSessionPair, clearSession, getRefreshToken } from "@/lib/session";
```

- [ ] **Step 4: 테스트가 통과하는 것을 확인한다**

Run: `pnpm test app/api/session/route.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: 뮤테이션으로 확인한다**

`try`/`catch`를 지워 `backendLogout` 실패가 그대로 던져지게 만든다 → "BE 폐기가 실패해도 쿠키는 지운다"가 FAIL해야 합니다. **원복**합니다.

- [ ] **Step 6: 검증**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: 전부 통과

- [ ] **Step 7: 커밋**

```bash
git add app/api/session/route.ts app/api/session/route.test.ts
git commit -m "[M15]auth: 로그아웃 시 서버 세션도 폐기

쿠키만 지우면 리프레시 토큰이 14일간 서버에 살아있다.
BE 폐기가 실패해도 쿠키는 지운다 — 버튼을 눌렀는데 로그인 상태로
남는 것이 서버 세션 잔존보다 나쁜 결과다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: 비밀번호 변경 후 로그인 화면으로

`PATCH /auth/password`는 성공 시 **본인 포함 전체 세션을 폐기**합니다(BE가 자동으로 합니다). 그런데 현재 `components/settings/password-form.tsx:29-31`은 성공 시 `setDone(true)`만 하고 페이지에 머뭅니다. 쿠키는 남아 있지만 서버 세션이 죽었으므로, 사용자는 다음 동작에서 알 수 없는 실패를 만납니다.

**Files:**
- Modify: `components/settings/password-form.tsx:29-31`
- Modify: `lib/messages.ts` (안내 문구 추가)

**Interfaces:**
- Consumes: `API_ROUTES.session`(DELETE로 쿠키 정리)·`PAGE_ROUTES.login` (기존 상수), `MESSAGES` (기존)
- Produces: 없음

- [ ] **Step 1: 현재 파일을 읽는다**

Run: `cat -n components/settings/password-form.tsx`
확인할 것: `useRouter` import 여부, `setDone` 사용처, `MESSAGES.settings` 키 이름.

- [ ] **Step 2: 안내 문구를 추가한다**

`lib/messages.ts`의 `settings` 절에 추가합니다(정확한 위치는 파일을 읽고 결정).

```ts
    passwordChangedRelogin: "비밀번호를 변경했어요. 보안을 위해 다시 로그인해주세요.",
```

- [ ] **Step 3: 성공 처리를 고친다**

`res.ok` 분기(29-31줄)를 교체합니다. `useRouter`가 import되어 있지 않으면 `import { useRouter } from "next/navigation";`을 추가하고 컴포넌트 안에서 `const router = useRouter();`를 선언합니다.

```ts
    if (res.ok) {
      reset();
      // BE가 비밀번호 변경 성공 시 본인 포함 전체 세션을 폐기한다.
      // 쿠키를 남기면 서버 세션이 죽은 상태로 앱을 쓰다가 알 수 없는 실패를 만난다.
      await fetch(API_ROUTES.session, { method: "DELETE" });
      router.replace(PAGE_ROUTES.login);
    } else {
```

`PAGE_ROUTES` import를 확인하고 없으면 추가합니다.

- [ ] **Step 4: 검증**

Run: `pnpm test && pnpm lint && pnpm typecheck && pnpm build`
Expected: 전부 통과

기존 E2E `settings.spec.ts`가 비밀번호 변경 성공 후 성공 메시지를 기대하고 있을 수 있습니다.

Run: `grep -n -B3 -A8 'password\|비밀번호' e2e/tests/settings.spec.ts`

기대가 깨지면 **테스트를 새 동작(로그인 화면으로 이동)에 맞게 고칩니다.** `test.fixme()`로 넘기지 않습니다(프로젝트 규칙 — 머지 금지).

- [ ] **Step 5: E2E를 돌린다**

Run: `pnpm e2e e2e/tests/settings.spec.ts`
Expected: PASS

`pnpm e2e`는 자체 Next 서버를 빌드·기동합니다. 별도로 `next dev`를 띄워 둔 상태로 실행하지 않습니다(프로젝트 규칙).

- [ ] **Step 6: 커밋**

```bash
git add components/settings/password-form.tsx lib/messages.ts e2e/tests/settings.spec.ts
git commit -m "[M15]settings: 비밀번호 변경 후 로그인 화면으로 이동

BE가 비밀번호 변경 성공 시 본인 포함 전체 세션을 폐기하는데
FE는 설정 페이지에 머물러 있었다. 쿠키를 정리하고 로그인으로 보낸다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: E2E — 목 BE 확장과 자동 갱신 회귀 테스트

가장 눈에 띄는 회귀는 "15분마다 로그인 화면을 보게 되는 것"입니다. 이걸 막는 회귀 테스트를 남깁니다.

목 BE는 무상태 sentinel 분기 방식을 씁니다(기존 `e2e/mock-be/server.ts` 패턴). 갱신도 같은 방식으로 만듭니다 — 특정 리프레시 토큰이면 성공, 특정 값이면 401입니다.

**Files:**
- Modify: `e2e/fixtures/e2e-constants.ts` (결합 상수 추가)
- Modify: `e2e/mock-be/server.ts` (`/auth/refresh`·`/auth/logout` 추가, 로그인 응답에 `refreshToken`)
- Modify: `e2e/fixtures/auth.ts` (리프레시 쿠키 주입 헬퍼)
- Create: `e2e/tests/auth-refresh.spec.ts`

**Interfaces:**
- Consumes: `SESSION_COOKIE`·`REFRESH_COOKIE` (Task 1), 갱신 배선 (Task 4)
- Produces: `E2E_REFRESH` 상수, `loginWithExpiredAccess(context)` 픽스처

- [ ] **Step 1: 결합 상수를 추가한다**

`e2e/fixtures/e2e-constants.ts` 끝에 추가합니다.

```ts
// 리프레시 토큰 E2E 결합 상수(목 BE와 테스트가 공유).
// 목 /auth/refresh는 validToken이면 새 쌍을 발급하고, deadToken이면 401을 준다.
export const E2E_REFRESH = {
  validToken: "e2e-refresh-token",
  deadToken: "e2e-refresh-dead",
  // 갱신으로 새로 발급되는 액세스 토큰. 목 /auth/me가 TENANT를 반환하도록
  // E2E_SESSION_TOKEN을 prefix로 유지한다(역할 판별이 .includes 기반).
  rotatedAccessToken: `${E2E_SESSION_TOKEN}-rotated`,
  rotatedRefreshToken: "e2e-refresh-token-rotated",
} as const;
```

`E2E_SESSION_TOKEN`을 참조하므로 그 선언(15줄) **아래**에 두어야 합니다.

- [ ] **Step 2: 목 BE에 갱신·로그아웃을 추가한다**

`e2e/mock-be/server.ts`의 로그인 분기(61-71줄) 뒤에 추가합니다. import에 `E2E_REFRESH`를 더합니다.

```ts
  // 갱신(POST /auth/refresh) — 공개. deadToken이면 401, 그 외엔 회전된 새 쌍 발급.
  if (url === "/auth/refresh" && method === "POST") {
    const body = await readJson(req);
    if (body.refreshToken === E2E_REFRESH.deadToken) {
      return send(res, 401, {
        statusCode: 401,
        code: "AUTH_INVALID_REFRESH_TOKEN",
        message: "리프레시 토큰이 유효하지 않습니다.",
      });
    }
    return send(res, 201, {
      accessToken: E2E_REFRESH.rotatedAccessToken,
      refreshToken: E2E_REFRESH.rotatedRefreshToken,
    });
  }

  // 로그아웃(POST /auth/logout) — 공개·멱등. 무상태라 성공만 표현한다.
  if (url === "/auth/logout" && method === "POST") {
    return send(res, 201, { ok: true });
  }
```

로그인 응답(70줄)도 토큰 쌍으로 고칩니다.

```ts
    return send(res, 201, {
      accessToken: E2E_SESSION_TOKEN,
      refreshToken: E2E_REFRESH.validToken,
    });
```

카카오 두 경로도 토큰 쌍을 주어야 합니다. `accessToken`만 주면 Task 5에서 고친 라우트가 `result.accessToken && result.refreshToken` 분기를 통과하지 못해 카카오 로그인이 역할 선택 화면으로 잘못 빠집니다.

`/auth/kakao`의 마지막 `return`(95줄, 기존 유저 분기)을 교체합니다.

```ts
    return send(res, 201, {
      accessToken: E2E_SESSION_TOKEN,
      refreshToken: E2E_REFRESH.validToken,
    });
```

`/auth/kakao/complete`의 마지막 `return`(108줄)도 교체합니다.

```ts
    return send(res, 201, {
      accessToken: E2E_SESSION_TOKEN,
      refreshToken: E2E_REFRESH.validToken,
    });
```

신규 유저 분기(93줄, `onboardingToken`만 주는 곳)는 **그대로 둡니다** — 토큰 쌍이 없는 상태가 이 분기의 정의입니다.

- [ ] **Step 3: 픽스처에 "액세스 만료" 상태를 추가한다**

`e2e/fixtures/auth.ts` 끝에 추가합니다. import에 `REFRESH_COOKIE`와 `E2E_REFRESH`를 더합니다.

```ts
// 액세스 쿠키 없이 리프레시 쿠키만 주입 — 액세스 토큰이 15분 뒤 만료되어
// 쿠키가 사라진 상태를 그대로 재현한다(쿠키 maxAge를 토큰 수명에 맞춰뒀다).
// proxy가 이 상태를 잡아 갱신해야 사용자가 만료를 체감하지 않는다.
export async function loginWithExpiredAccess(context: BrowserContext): Promise<void> {
  await context.addCookies([
    {
      name: REFRESH_COOKIE,
      value: E2E_REFRESH.validToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

// 리프레시 토큰까지 죽은 상태 — 갱신이 401을 받아 로그인 화면으로 가야 한다.
export async function loginWithDeadRefresh(context: BrowserContext): Promise<void> {
  await context.addCookies([
    {
      name: REFRESH_COOKIE,
      value: E2E_REFRESH.deadToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
```

- [ ] **Step 4: E2E 테스트를 쓴다**

`e2e/tests/auth-refresh.spec.ts`를 만듭니다. 시멘틱 셀렉터만 쓰고 하드 대기를 넣지 않습니다(프로젝트 규칙).

```ts
import { test, expect } from "@playwright/test";
import { loginWithExpiredAccess, loginWithDeadRefresh } from "../fixtures/auth";
import { PAGE_ROUTES, SESSION_COOKIE, REFRESH_COOKIE } from "../../lib/constants";
import { E2E_REFRESH } from "../fixtures/e2e-constants";

test.describe("액세스 토큰 자동 갱신", () => {
  test("액세스 쿠키가 만료돼도 리프레시 쿠키가 살아있으면 대시보드가 그대로 열린다", async ({
    context,
    page,
  }) => {
    // 이게 깨지면 사용자는 15분마다 로그인 화면을 보게 된다 — 가장 눈에 띄는 회귀다.
    await loginWithExpiredAccess(context);

    await page.goto(PAGE_ROUTES.dashboard);

    await expect(page).toHaveURL(new RegExp(`${PAGE_ROUTES.dashboard}$`));
  });

  test("갱신된 토큰 쌍이 쿠키에 교체 저장된다", async ({ context, page }) => {
    // 리프레시 토큰은 회전한다. 옛 값을 남기면 다음 갱신에서 소비된 토큰을
    // 제출해 BE가 세션 가족을 폐기하고 사용자가 전 기기에서 로그아웃된다.
    await loginWithExpiredAccess(context);

    await page.goto(PAGE_ROUTES.dashboard);
    await expect(page).toHaveURL(new RegExp(`${PAGE_ROUTES.dashboard}$`));

    const cookies = await context.cookies();
    const access = cookies.find((c) => c.name === SESSION_COOKIE);
    const refresh = cookies.find((c) => c.name === REFRESH_COOKIE);

    expect(access?.value).toBe(E2E_REFRESH.rotatedAccessToken);
    expect(refresh?.value).toBe(E2E_REFRESH.rotatedRefreshToken);
  });

  test("리프레시 토큰까지 죽으면 로그인 화면으로 보낸다", async ({ context, page }) => {
    await loginWithDeadRefresh(context);

    await page.goto(PAGE_ROUTES.dashboard);

    await expect(page).toHaveURL(new RegExp(`${PAGE_ROUTES.login}$`));
  });

  test("죽은 세션의 쿠키는 정리된다", async ({ context, page }) => {
    // 남겨두면 매 요청마다 갱신을 시도해 401을 반복한다.
    await loginWithDeadRefresh(context);

    await page.goto(PAGE_ROUTES.dashboard);
    await expect(page).toHaveURL(new RegExp(`${PAGE_ROUTES.login}$`));

    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === REFRESH_COOKIE)?.value).toBeFalsy();
  });
});
```

- [ ] **Step 5: E2E를 돌린다**

Run: `pnpm e2e e2e/tests/auth-refresh.spec.ts`
Expected: PASS (4 tests × 브라우저 수)

- [ ] **Step 6: burn-in으로 flaky를 확인한다**

Run: `pnpm e2e:burn e2e/tests/auth-refresh.spec.ts`
Expected: 전부 PASS. 한 번이라도 실패하면 **머지 전에 고칩니다**(프로젝트 규칙).

- [ ] **Step 7: 기존 E2E 전체가 깨지지 않았는지 확인한다**

Run: `pnpm e2e`
Expected: 전부 PASS.

기존 픽스처(`loginAs`)는 액세스 쿠키를 주입하므로 proxy가 갱신을 시도하지 않아 영향이 없어야 합니다. 깨지면 matcher 확장이 예상치 못한 경로를 잡은 것일 수 있으니 실패 메시지를 먼저 읽습니다.

- [ ] **Step 8: 커밋**

```bash
git add e2e/
git commit -m "[M15]test: 액세스 토큰 자동 갱신 E2E 커버리지

목 BE에 /auth/refresh·/auth/logout을 추가하고 로그인 응답을 토큰 쌍으로
바꿨다. 액세스 쿠키 없이 리프레시 쿠키만 있는 상태를 픽스처로 재현해
15분마다 로그인 화면을 보게 되는 회귀를 막는다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## 완료 후 확인

- [ ] `pnpm test` · `pnpm lint` · `pnpm typecheck` · `pnpm build` · `pnpm e2e` 전부 통과
- [ ] `grep -rn 'setSession\b' app lib components` → 결과 없음(토큰 쌍 저장으로 전환 완료)
- [ ] `pnpm build`에 `middleware` deprecation 경고 없음
- [ ] `git log --oneline origin/main..HEAD` → 태스크별 커밋 8개 내외
- [ ] PR 전 rebase: `git fetch origin && git rebase origin/main && git push --force-with-lease`
- [ ] PR 본문에 이 계획 문서 경로와 BE PR 링크(https://github.com/Jin-dev92/estate-server/pull/101)를 첨부

## 배포 순서 — 코드 밖 작업

**FE 배포 전까지 운영 env의 `JWT_EXPIRES_IN`을 `1h`로 유지해야 합니다.** FE 갱신 로직이 없는 상태에서 15분으로 내리면 사용자가 15분 뒤 401을 맞고 복구 경로가 없습니다. env로 조정 가능하므로 코드 변경 없이 FE 배포 후에 `15m`으로 내립니다. (`.env.example`과 `auth.module.ts`의 기본값은 이미 `15m`이며 로컬·신규 환경 기준입니다.)

## 참고 문서

| 무엇 | 경로 |
|---|---|
| BE 설계 스펙(위협 모델·결정 근거·한계) | `estate-server/docs/superpowers/specs/2026-07-30-refresh-token-design.md` |
| BE 구현 계획 | `estate-server/docs/superpowers/plans/2026-07-30-refresh-token.md` |
| BE 갱신 구현(가족 폐기 판정 근거) | `estate-server/src/auth/application/refresh-tokens.use-case.ts` |
| API 표·에러 코드 | `estate-server/README.md` `### Auth` 절 |
| BE PR | https://github.com/Jin-dev92/estate-server/pull/101 |
| Next 16 proxy 개명 | `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md:625` |
| Next proxy 규약(쿠키·헤더) | `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` |
