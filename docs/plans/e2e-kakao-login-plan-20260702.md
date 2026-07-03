# 카카오 로그인 E2E 커버리지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이미 구현된 카카오 OAuth 로그인(콜백~완료)에 대해 목 BE 엔드포인트와 Playwright E2E 스펙을 추가해 회귀를 잡는다.

**Architecture:** 목 BE(`e2e/mock-be/server.ts`)는 기존 관례대로 무상태 sentinel 분기(`code`/`onboardingToken` 값으로 응답 결정)로 `/auth/kakao`·`/auth/kakao/complete` 두 라우트를 추가한다. 콜백 페이지는 `sessionStorage`의 `state`를 사전에 심어야 진입 가능하므로, 이를 캡슐화한 `gotoKakaoCallback` 헬퍼를 신설하고 `auth-kakao.spec.ts`에서 4개 시나리오를 검증한다. 외부(`kauth.kakao.com`) 리다이렉트 구간은 범위 밖.

**Tech Stack:** TypeScript, Playwright, Node `http`(mock BE), pnpm.

**Spec:** `docs/test/e2e-kakao-spec.md`

## Global Constraints

- `.ts`/`.tsx`만 사용. 신규 `.js`/`.jsx` 금지.
- E2E 셀렉터는 시멘틱만(`getByRole`/`getByLabel`/`getByText`). CSS 클래스·DOM 구조 금지.
- 하드 대기(`waitForTimeout`) 금지 — `expect`의 auto-wait 또는 `page.waitForResponse` 사용.
- 카피·경로 리터럴 하드코딩 금지 — `MESSAGES`·`PAGE_ROUTES` 등 단일 출처 import(단, URL 부분일치 정규식은 기존 스펙 관례상 리터럴 허용 — `auth-login.spec.ts`·`onboarding-signup.spec.ts` 참고).
- 목 BE와 테스트가 공유하는 식별자는 `e2e/fixtures/e2e-constants.ts`에 단일 출처로 둔다.
- 작성 직후 burn-in(`pnpm e2e:burn -- e2e/tests/auth-kakao.spec.ts`)으로 flaky 확인, 실패 시 머지 전 수정.
- `pnpm e2e`는 자체 Next 서버를 빌드·기동한다 — 별도 `next dev`를 띄워 둔 상태로 실행하지 않는다.
- 검증: `pnpm e2e e2e/tests/auth-kakao.spec.ts` 전 브라우저 통과, 기존 스위트 회귀 없음.

---

### Task 1: 목 BE 카카오 라우트 + 결합 상수

**Files:**
- Modify: `e2e/fixtures/e2e-constants.ts` (파일 끝, `E2E_BUILDING` 다음에 추가)
- Modify: `e2e/mock-be/server.ts` (`/auth/signup` POST 블록 다음에 추가, import 목록에 `E2E_KAKAO` 추가)

**Interfaces:**
- Produces: `E2E_KAKAO = { existingCode, newCode, errorCode, onboardingToken }` (모두 `string`, `as const`)
- Produces(BE 계약): `POST /auth/kakao` — `{code}` → `code===existingCode`: 201 `{accessToken:E2E_SESSION_TOKEN}` / `code===newCode`: 201 `{onboardingToken:E2E_KAKAO.onboardingToken}` / `code===errorCode`: 400. `POST /auth/kakao/complete` — `{onboardingToken}` → 일치 시 201 `{accessToken:E2E_SESSION_TOKEN}`, 불일치 시 400.

- [ ] **Step 1: 라우트 추가 전 상태 확인(실패 확인)**

Run:
```bash
pnpm e2e:mock-be &
sleep 1
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3099/auth/kakao \
  -H "Content-Type: application/json" -d '{"code":"kakao-existing-code"}'
kill %1
```
Expected: `404` (아직 라우트 없음 — mock-be의 catch-all)

- [ ] **Step 2: `E2E_KAKAO` 상수 추가**

`e2e/fixtures/e2e-constants.ts` 파일 끝(76번째 줄, `E2E_BUILDING` 블록 다음)에 추가:

```ts
// 카카오 OAuth E2E 결합 상수(목 BE와 테스트가 공유, 무상태 sentinel 분기).
export const E2E_KAKAO = {
  existingCode: "kakao-existing-code",
  newCode: "kakao-new-code",
  errorCode: "kakao-error-code",
  onboardingToken: "kakao-onboarding-e2e",
} as const;
```

- [ ] **Step 3: mock BE에 카카오 라우트 추가**

`e2e/mock-be/server.ts` 상단 import에 `E2E_KAKAO` 추가:

```ts
import { E2E_CREDENTIALS, E2E_SESSION_TOKEN, E2E_OWNER_TOKEN, E2E_KAKAO } from "../fixtures/e2e-constants";
```

`/auth/signup` POST 블록(`if (url === "/auth/signup" && method === "POST") { ... }`) 바로 다음에 추가:

```ts
  // 카카오 로그인(POST /auth/kakao) — code sentinel로 분기(무상태).
  // existingCode: 기존 연동 계정(accessToken 즉시 발급) / newCode: 신규 사용자(onboardingToken만 발급)
  // / errorCode: 이메일 동의 누락 등 BE 400 에러 재현.
  if (url === "/auth/kakao" && method === "POST") {
    const body = await readJson(req);
    if (body.code === E2E_KAKAO.errorCode) {
      return send(res, 400, {
        statusCode: 400,
        code: "AUTH_KAKAO_EMAIL_REQUIRED",
        message: "카카오 이메일 동의가 필요합니다.",
      });
    }
    if (body.code === E2E_KAKAO.newCode) {
      return send(res, 201, { onboardingToken: E2E_KAKAO.onboardingToken });
    }
    return send(res, 201, { accessToken: E2E_SESSION_TOKEN });
  }

  // 카카오 온보딩 완료(POST /auth/kakao/complete) — onboardingToken이 유효할 때만 accessToken 발급.
  if (url === "/auth/kakao/complete" && method === "POST") {
    const body = await readJson(req);
    if (body.onboardingToken !== E2E_KAKAO.onboardingToken) {
      return send(res, 400, {
        statusCode: 400,
        code: "AUTH_KAKAO_ONBOARDING_INVALID",
        message: "잘못된 온보딩 토큰입니다.",
      });
    }
    return send(res, 201, { accessToken: E2E_SESSION_TOKEN });
  }
```

- [ ] **Step 4: 라우트 동작 확인**

Run:
```bash
pnpm e2e:mock-be &
sleep 1
curl -s -X POST http://localhost:3099/auth/kakao -H "Content-Type: application/json" \
  -d '{"code":"kakao-existing-code"}'
# Expect: {"accessToken":"e2e-token"}
curl -s -X POST http://localhost:3099/auth/kakao -H "Content-Type: application/json" \
  -d '{"code":"kakao-new-code"}'
# Expect: {"onboardingToken":"kakao-onboarding-e2e"}
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3099/auth/kakao \
  -H "Content-Type: application/json" -d '{"code":"kakao-error-code"}'
# Expect: 400
curl -s -X POST http://localhost:3099/auth/kakao/complete -H "Content-Type: application/json" \
  -d '{"onboardingToken":"kakao-onboarding-e2e","role":"OWNER"}'
# Expect: {"accessToken":"e2e-token"}
kill %1
```

- [ ] **Step 5: Commit**

```bash
git add e2e/fixtures/e2e-constants.ts e2e/mock-be/server.ts
git commit -m "test: 카카오 로그인 목 BE 라우트 추가"
```

---

### Task 2: `gotoKakaoCallback` 헬퍼 + 시나리오 ① 기존 계정 로그인

**Files:**
- Create: `e2e/fixtures/kakao.ts`
- Create: `e2e/tests/auth-kakao.spec.ts`

**Interfaces:**
- Consumes: Task 1의 `E2E_KAKAO`, `PAGE_ROUTES.login`("/login")·`PAGE_ROUTES.kakaoCallback`("/auth/kakao/callback")·`PAGE_ROUTES.dashboard`("/dashboard")(`lib/constants.ts`), `KAKAO_STATE_KEY`(`lib/constants.ts`).
- Produces: `gotoKakaoCallback(page: Page, opts: { code: string; urlState: string; seededState: string | null }): Promise<void>` — 이후 Task 3~5가 그대로 재사용.

- [ ] **Step 1: 실패하는 테스트 작성**

`e2e/tests/auth-kakao.spec.ts` 신규 생성:

```ts
import { test, expect } from "@playwright/test";
import { PAGE_ROUTES } from "../../lib/constants";
import { E2E_KAKAO } from "../fixtures/e2e-constants";
import { gotoKakaoCallback } from "../fixtures/kakao";

test("기존 카카오 연동 계정으로 콜백에 진입하면 대시보드로 이동한다", async ({ page }) => {
  await gotoKakaoCallback(page, {
    code: E2E_KAKAO.existingCode,
    urlState: "state-existing",
    seededState: "state-existing",
  });

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("터전")).toBeVisible();
  await expect(page.getByRole("heading", { name: "내 계약" })).toBeVisible();
});
```

- [ ] **Step 2: 실행해 실패 확인**

Run: `pnpm e2e e2e/tests/auth-kakao.spec.ts`
Expected: FAIL — `gotoKakaoCallback`을 import할 `e2e/fixtures/kakao.ts`가 없어 빌드/타입 에러.

- [ ] **Step 3: 헬퍼 구현**

`e2e/fixtures/kakao.ts` 신규 생성:

```ts
import type { Page } from "@playwright/test";
import { KAKAO_STATE_KEY, PAGE_ROUTES } from "../../lib/constants";

// 카카오 콜백 페이지는 sessionStorage의 state와 URL의 state를 대조해 CSRF를 가드한다.
// 외부(kauth.kakao.com) 리다이렉트는 우리 코드가 아니므로 콜백 페이지부터 시작하고,
// 진입 전 sessionStorage를 직접 심어 재현한다(스펙 범위 결정: docs/test/e2e-kakao-spec.md).
export async function gotoKakaoCallback(
  page: Page,
  opts: { code: string; urlState: string; seededState: string | null },
): Promise<void> {
  await page.goto(PAGE_ROUTES.login);
  await page.evaluate(
    ({ key, value }) => {
      if (value === null) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, value);
    },
    { key: KAKAO_STATE_KEY, value: opts.seededState },
  );
  await page.goto(
    `${PAGE_ROUTES.kakaoCallback}?code=${encodeURIComponent(opts.code)}&state=${encodeURIComponent(opts.urlState)}`,
  );
}
```

- [ ] **Step 4: 실행해 통과 확인**

Run: `pnpm e2e e2e/tests/auth-kakao.spec.ts`
Expected: PASS (1 passed)

- [ ] **Step 5: Commit**

```bash
git add e2e/fixtures/kakao.ts e2e/tests/auth-kakao.spec.ts
git commit -m "test: 카카오 로그인 E2E — 기존 계정 로그인 시나리오"
```

---

### Task 3: 시나리오 ② 신규 가입 → 역할선택 → 대시보드

**Files:**
- Modify: `e2e/tests/auth-kakao.spec.ts` (테스트 추가)

**Interfaces:**
- Consumes: Task 2의 `gotoKakaoCallback`, `E2E_KAKAO`. `PAGE_ROUTES.roleSelect`("/signup/role-select").
- 역할 선택 화면(`components/auth/role-select-form.tsx`)의 버튼 텍스트는 `"건물주"`/`"입주자"`(리터럴 — 컴포넌트가 `ROLE_LABEL`이 아닌 하드코딩 문자열 사용, 기존 코드 그대로 둠).

- [ ] **Step 1: 실패하는 테스트 작성**

`e2e/tests/auth-kakao.spec.ts`에 추가:

```ts
test("신규 카카오 사용자는 역할 선택 후 대시보드로 이동한다", async ({ page }) => {
  await gotoKakaoCallback(page, {
    code: E2E_KAKAO.newCode,
    urlState: "state-new",
    seededState: "state-new",
  });

  await expect(page).toHaveURL(/\/signup\/role-select/);
  await expect(page.getByRole("heading", { name: "역할 선택" })).toBeVisible();

  const [res] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/auth/kakao/complete") && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "건물주" }).click(),
  ]);
  expect(res.ok()).toBe(true);
  await expect(page).toHaveURL(/\/dashboard/);
});
```

- [ ] **Step 2: 실행해 실패 확인**

Run: `pnpm e2e e2e/tests/auth-kakao.spec.ts -g "신규 카카오"`
Expected: FAIL — Task 1에서 이미 `/auth/kakao/complete` 라우트를 추가했다면 이 단계는 PASS로 바로 넘어갈 수 있다. 만약 Task 1이 먼저 완료된 상태라면 이 Step은 생략하고 Step 3(실행 확인)만 수행한다.

- [ ] **Step 3: 실행해 통과 확인**

Run: `pnpm e2e e2e/tests/auth-kakao.spec.ts`
Expected: PASS (2 passed)

- [ ] **Step 4: Commit**

```bash
git add e2e/tests/auth-kakao.spec.ts
git commit -m "test: 카카오 로그인 E2E — 신규 가입 역할선택 시나리오"
```

---

### Task 4: 시나리오 ③ state 불일치(CSRF 가드)

**Files:**
- Modify: `e2e/tests/auth-kakao.spec.ts` (테스트 추가, `MESSAGES` import 추가)

**Interfaces:**
- Consumes: `MESSAGES.auth.kakaoFailed`(`lib/messages.ts`) — 콜백 페이지가 `state` 불일치 시 표시하는 문구.

- [ ] **Step 1: 테스트 작성**

`e2e/tests/auth-kakao.spec.ts` 상단 import에 추가:

```ts
import { MESSAGES } from "../../lib/messages";
```

테스트 추가:

```ts
test("state가 일치하지 않으면 에러를 보이고 콜백 페이지에 머무른다", async ({ page }) => {
  await gotoKakaoCallback(page, {
    code: E2E_KAKAO.existingCode,
    urlState: "state-mismatch-url",
    seededState: "state-mismatch-seeded",
  });

  await expect(page.getByText(MESSAGES.auth.kakaoFailed)).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/kakao\/callback/);
});
```

- [ ] **Step 2: 실행해 통과 확인**

Run: `pnpm e2e e2e/tests/auth-kakao.spec.ts`
Expected: PASS (3 passed) — 이 시나리오는 콜백 페이지의 클라이언트단 가드(`state !== saved`)만으로 재현되므로 BE 호출 없이 바로 통과해야 한다.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/auth-kakao.spec.ts
git commit -m "test: 카카오 로그인 E2E — state 불일치 에러 시나리오"
```

---

### Task 5: 시나리오 ④ BE 에러 응답 + burn-in 검증

**Files:**
- Modify: `e2e/tests/auth-kakao.spec.ts` (테스트 추가)

**Interfaces:**
- Consumes: `MESSAGES.auth.kakaoEmailRequired`, `E2E_KAKAO.errorCode`.

- [ ] **Step 1: 테스트 작성**

`e2e/tests/auth-kakao.spec.ts`에 추가:

```ts
test("BE가 400을 반환하면 콜백에 에러 메시지를 보인다", async ({ page }) => {
  await gotoKakaoCallback(page, {
    code: E2E_KAKAO.errorCode,
    urlState: "state-error",
    seededState: "state-error",
  });

  await expect(page.getByText(MESSAGES.auth.kakaoEmailRequired)).toBeVisible();
});
```

- [ ] **Step 2: 실행해 통과 확인**

Run: `pnpm e2e e2e/tests/auth-kakao.spec.ts`
Expected: PASS (4 passed)

- [ ] **Step 3: burn-in으로 flaky 확인**

Run: `pnpm e2e:burn -- e2e/tests/auth-kakao.spec.ts`
Expected: 4개 테스트 × 5회 반복 × 3브라우저 전부 PASS, 실패 0건.

- [ ] **Step 4: 전체 스위트 회귀 확인**

Run: `pnpm e2e`
Expected: 기존 스위트 포함 전체 PASS(기존 87개 + 신규 4개 = 91개, 3브라우저 배수).

- [ ] **Step 5: Commit**

```bash
git add e2e/tests/auth-kakao.spec.ts
git commit -m "test: 카카오 로그인 E2E — BE 에러 응답 시나리오"
```

---

### Task 6: README 백로그·커버리지 갱신

**Files:**
- Modify: `README.md`

**Interfaces:**
- 없음(문서 갱신만).

- [ ] **Step 1: 커버리지 표에 카카오 행 추가**

`README.md`의 커버리지 표(`| 로그인 스모크 (...) | ✅ |` 행 바로 다음)에 추가:

```
| 카카오 OAuth 로그인 (콜백 진입 · 기존계정→대시보드 · 신규가입→역할선택→대시보드 · state 불일치 에러 · BE 에러) | ✅ |
```

- [ ] **Step 2: 후속 백로그에서 우선순위 1 항목을 완료로 정리**

`### 후속 백로그 (남은 작업)` 섹션의 완료 항목 안내 줄:

```
> 완료된 항목(알림·온보딩·초대코드·채팅·설정·대시보드·게시판/프로필/알림 영속성·폼검증·멀티브라우저·`MESSAGES.auth.login`)은 위 커버리지 표에 반영. 아래는 **남은 작업**만. 우선순위 순으로 정렬(2026-07-02 지정).
```

를 다음으로 교체:

```
> 완료된 항목(알림·온보딩·초대코드·채팅·설정·대시보드·게시판/프로필/알림 영속성·폼검증·멀티브라우저·`MESSAGES.auth.login`·카카오 로그인 E2E)은 위 커버리지 표에 반영. 아래는 **남은 작업**만. 우선순위 순으로 정렬(2026-07-02 지정).
```

`- [ ] **[우선순위 1] 신규 기능(OAuth 소셜 로그인 / 채팅 자동 번역)**: 백엔드 F1 · F2에 맞춰 추가.` 줄을 삭제하고, 나머지 우선순위 번호([우선순위 2]→[우선순위 1], [우선순위 3]→[우선순위 2])를 한 칸씩 당긴다. 결과:

```
- [ ] **[우선순위 1] 채팅 E2E 확장(잔여)**: 재연결/`connect_error`·멀티유저 수신(상대가 보낸 메시지)만 미커버 — 방 목록·진입·start-chat·실시간 연결·전송→에코·비참가자 에러는 커버 완료(스펙: `docs/test/e2e-chat-spec.md`).
- [ ] **[우선순위 2] 공식 에이전트 도입 검토**: Playwright Planner/Generator/Healer(`init-agents`).
- [ ] 드리프트 게이트 확장: leases · buildings 플로우가 실 픽스처로 채워지면 `mockLease()`·`mockBuilding()` 등 타입드 빌더로 편입(알림은 `mockNotifications()`로 편입 완료).
- [ ] 테스트 typecheck 정비: `tsconfig.vitest.json` 분리 + `vi.fn()` 파라미터 타입화(약 44건) + `**/*.test.*` exclude 제거 — 현재 루트 tsconfig의 `types:["vitest/globals"]` 스톱갭 해소.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: 카카오 로그인 E2E 커버리지 완료 반영, 백로그 우선순위 갱신"
```
