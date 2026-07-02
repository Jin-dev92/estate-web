# E2E 스펙 — 카카오 OAuth 로그인 커버리지

> 작성: 2026-07-02 · 대상: 카카오 소셜 로그인(콜백~완료) E2E · 방식: SDD 경량(단일 접근, 무상태 목).

## Context / 목표

카카오 OAuth 로그인은 이미 구현되어 있다(`app/login` 버튼 · `app/auth/kakao/callback` · `app/signup/role-select` · `lib/api/kakao.ts`, PR #18). 그러나 `e2e/` 안에 카카오 관련 스펙이 없어 회귀를 잡지 못한다. 본 스펙은 이 공백을 메운다.

README 우선순위 재정의에 따라 신규 기능 개발이 아니라 **기존 기능의 E2E 커버리지 추가** 작업이다.

## Current State (확인됨)

- 플로우: `/login` 버튼 클릭 → (외부) `kauth.kakao.com` → `/auth/kakao/callback?code&state` → `state`를 `sessionStorage[KAKAO_STATE_KEY]`와 대조 → `POST /api/auth/kakao` → 기존 계정이면 `next:"dashboard"`(세션 설정 후 `/dashboard`), 신규면 `onboardingToken`을 `sessionStorage[KAKAO_ONBOARDING_KEY]`에 저장하고 `/signup/role-select`로 이동 → 역할 선택 시 `POST /api/auth/kakao/complete` → 세션 설정 후 `/dashboard`.
- `e2e/mock-be/server.ts`에 `/auth/kakao`, `/auth/kakao/complete` 라우트가 없다(추가 필요).
- 기존 인증 E2E(`e2e/tests/auth-login.spec.ts`)는 이메일/비번 로그인만 다룬다.

## 범위 결정 (사용자 확인 완료)

- **외부 리다이렉트(kauth.kakao.com) 구간은 범위 밖.** 콜백 페이지(`/auth/kakao/callback`)부터 테스트한다. 이유: 외부 도메인은 우리 코드가 아니라 mock 대상이 아니고, `page.route`로 가로채는 방식은 실 네트워크 경로를 흉내내려다 flaky 위험만 늘린다.
- 커버 시나리오 4종(모두 포함, 사용자 확인 완료): ①기존 계정 로그인→대시보드 ②신규 가입→역할선택→대시보드 ③`state` 불일치(CSRF 가드) 에러 ④BE 에러(400) 응답.

## 설계 (단일 접근 — 무상태 목 + sentinel 분기)

기존 목 BE는 대부분 무상태(로그인 성공/실패도 이메일 sentinel로 분기)이며, 카카오도 동일 패턴이 자연스럽다. 별도 상태 저장 없이 `code`/`onboardingToken` 값으로 분기한다.

**`E2E_KAKAO` 상수** (`e2e/fixtures/e2e-constants.ts`)
```
existingCode: "kakao-existing-code"   → 기존 계정 경로 트리거
newCode: "kakao-new-code"             → 신규 가입 경로 트리거
errorCode: "kakao-error-code"         → BE 400 에러 트리거
onboardingToken: "kakao-onboarding-e2e"
```

**목 BE 라우트 추가** (`e2e/mock-be/server.ts`)
- `POST /auth/kakao`: `code===existingCode` → 201 `{accessToken:E2E_SESSION_TOKEN}` / `code===newCode` → 201 `{onboardingToken}` / `code===errorCode` → 400 `{message:"카카오 계정에 이메일 동의가 필요합니다."}`(→ FE errorMap이 `MESSAGES.auth.kakaoEmailRequired`로 덮어씀)
- `POST /auth/kakao/complete`: `onboardingToken===E2E_KAKAO.onboardingToken` → 201 `{accessToken:E2E_SESSION_TOKEN}`, 그 외 → 400

**헬퍼** (`e2e/fixtures/kakao.ts`, 신규)
```
gotoKakaoCallback(page, { code, urlState, seededState })
```
`/login`으로 먼저 이동해 origin을 확보하고 `page.evaluate`로 `sessionStorage[KAKAO_STATE_KEY]=seededState`를 심은 뒤 `/auth/kakao/callback?code=${code}&state=${urlState}`로 이동한다. `state` 일치 테스트는 `seededState===urlState`, 불일치 테스트는 다른 값을 준다.

**스펙 파일** (`e2e/tests/auth-kakao.spec.ts`, 신규 — 기존 도메인별 분리 관례를 따름)

## Acceptance Criteria

1. `code=existingCode` + state 일치 → `/dashboard` 이동, "터전" 헤더 노출.
2. `code=newCode` + state 일치 → `/signup/role-select` 이동 → "건물주" 버튼 클릭(실제 `/api/auth/kakao/complete` 호출) → `/dashboard` 이동.
3. state 불일치 → `MESSAGES.auth.kakaoFailed` 노출, 콜백 페이지에 머무름(BE 미호출).
4. `code=errorCode` → 콜백에 에러 메시지 노출.
5. 3개 브라우저(chromium·firefox·webkit) + `pnpm e2e:burn` 무 flaky. 기존 스위트 회귀 없음.

## Out of scope

- `/login` 버튼 클릭 → 외부 리다이렉트 구간(위 범위 결정 참고).
- 카카오 계정 연동 해제, 기존 이메일 계정과의 병합 등 백엔드 F1 세부 정책.
