# 핸드오프 — 인증 가드 E2E를 Generator 에이전트로 생성 (시범)

> 작성: 2026-07-03 · 브랜치: `test/e2e-auth-guard`(최신 main 기준 생성됨) · 이전 세션에서 계획 수립까지 완료, **새 세션에서 실행**하기 위한 핸드오프.

## 왜 새 세션인가

`.claude/agents/`(Playwright 서브에이전트 3종)와 `.mcp.json`(`playwright-test` MCP 서버)은 **세션 시작 시점에 로드**된다. PR #41에서 머지됐지만 이전 세션은 그 전에 시작돼 인식하지 못했다. 새 세션은 시작 시 `.mcp.json`의 MCP 서버 승인을 물을 수 있다 — **승인해야** 에이전트가 브라우저 도구를 쓸 수 있다.

## 작업 목표 (2가지)

1. **주목적**: `middleware.ts` 인증 가드 E2E 커버리지 추가 — `e2e/tests/auth-guard.spec.ts`.
2. **부목적**: `playwright-test-generator` 에이전트 시범 사용 및 평가(시험 도입 평가의 절반 — 나머지 절반은 Healer. 배경: `docs/test/playwright-agents-review.md`).

## 경량 플랜 (이전 세션에서 확정)

- **커버 대상**: `middleware.ts` — `PROTECTED=["/dashboard"]` 미인증 차단, `AUTH_PAGES=["/login","/signup"]` 인증 시 차단.
- **시나리오 3개**:
  1. 미인증 상태로 `/dashboard` 접근 → `/login` 리다이렉트(URL + "로그인" 헤딩 단언)
  2. `loginAs(context)` 후 `/login` 접근 → `/dashboard` 리다이렉트(URL + "내 계약" 헤딩 단언)
  3. `loginAs(context)` 후 `/signup` 접근 → `/dashboard` 리다이렉트
- **목 BE 계약**: 변경 없음(기존 목 그대로 — 이 시나리오들은 새 엔드포인트를 부르지 않는다).
- **성공 기준**: 시멘틱 셀렉터만, `PAGE_ROUTES` import(리터럴 금지), burn-in(`npx playwright test --repeat-each=5 e2e/tests/auth-guard.spec.ts`) 무 flaky, `pnpm e2e` 전체 회귀 없음. `pnpm e2e:burn -- <file>`은 인자 전달 버그가 있으니 npx 직접 사용.

## 새 세션에서 할 일

1. 이 브랜치(`test/e2e-auth-guard`)에서 시작하는지 확인(`git branch --show-current`).
2. **playwright-test-generator 에이전트를 디스패치**해 위 시나리오 3개로 `e2e/tests/auth-guard.spec.ts` 생성. 에이전트에게 줄 것: 위 시나리오, 시드(`e2e/tests/seed.spec.ts`)의 `loginAs` 셋업 패턴, AGENTS.md E2E 규약(시멘틱 셀렉터·리터럴 금지·한국어 테스트 제목).
3. 생성물을 **사람 기준으로 리뷰**: 규약 위반(리터럴·CSS 셀렉터·하드 대기) 발견 시 수정.
4. 검증: 단일 실행(3브라우저) → burn-in → `pnpm e2e` 전체 → `pnpm lint`/`typecheck`.
5. **Generator 평가 기록**(검토 문서의 시험 평가 기준): 걸린 시간, 생성물 품질(규약 준수율·수정 필요 개수), 기존 방식 대비 체감 — `docs/test/playwright-agents-review.md`에 "시범 결과" 섹션으로 추가.
6. 커밋(`test: 인증 가드 E2E — 미인증 차단·인증 시 auth 페이지 차단`) → README 커버리지 표에 행 추가 → PR(base main).

## 만약 에이전트가 여전히 안 뜨면

- 새 세션에서도 `playwright-test-generator` 타입이 없으면: `.mcp.json` 승인 여부 확인, 레포 루트(정확히는 이 워크트리 루트)에 `.claude/agents/*.md`가 존재하는지 확인.
- 그래도 안 되면 기존 방식(직접 작성)으로 커버리지만 완성하고, 에이전트 시범 실패 원인을 검토 문서에 기록한다(그 자체도 평가 데이터).
