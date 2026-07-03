# 검토 — Playwright 공식 에이전트(Planner·Generator·Healer) 도입

> 작성: 2026-07-03 · 대상: README 백로그 우선순위 1 "공식 에이전트 도입 검토" · 산출물: 도입 여부 판단 자료.
> 이 문서는 **주니어 개발자가 배경지식 없이도 이해할 수 있도록** 개념 설명을 포함해서 씁니다.

## 0. 먼저 알아야 할 개념

**Playwright 공식 에이전트란?** Playwright가 v1.5x부터 제공하는 **AI 에이전트 정의 파일 세트**입니다. "에이전트"라고 해서 별도 프로그램이 도는 게 아니라, Claude Code(또는 Codex·Copilot 등)가 읽는 **서브에이전트 정의(markdown) + 전용 MCP 서버 설정**을 레포에 생성해 주는 것입니다. `npx playwright init-agents --loop=claude`를 실행하면 파일들이 만들어집니다.

**MCP(Model Context Protocol)란?** AI 도구(Claude Code 등)가 외부 프로그램의 기능을 "도구(tool)"로 빌려 쓰는 표준입니다. Playwright는 `run-test-mcp-server`라는 MCP 서버를 제공하는데, 이걸 통해 AI가 **실제 브라우저를 조종**(클릭·입력·스냅샷)하고 **테스트를 실행/디버그**할 수 있게 됩니다. 즉 지금까지 우리 세션의 AI는 "코드를 읽고" 테스트를 짰다면, 이 에이전트들은 "실제 화면을 보면서" 테스트를 짭니다.

**세 에이전트의 역할** (설치되는 `.claude/agents/*.md` 기준, 실제 파일 내용을 읽고 확인함):

| 에이전트 | 역할 | 우리 워크플로우로 치면 |
|---|---|---|
| **Planner** | 실제 브라우저로 앱을 탐색하며 테스트 계획(md)을 작성해 `specs/`에 저장 | 스펙 작성(SDD의 spec 단계) |
| **Generator** | 계획을 받아 브라우저로 각 단계를 **실제 실행해 검증하면서** 테스트 코드 생성 | 구현(테스트 작성) 단계 |
| **Healer** | 실패한 테스트를 `test_debug`로 멈춰 세워 스냅샷을 보며 원인 분석 → 코드 수정 → 재실행 반복 | flaky/실패 수리 |

## 1. `init-agents --loop=claude`가 실제로 만드는 것 (v1.61.1 소스 확인)

설치된 `playwright` 패키지의 `lib/agents/generateAgents.js`를 직접 읽고 확인한 내용입니다:

1. `.claude/agents/playwright-test-planner.md` · `-generator.md` · `-healer.md` — Claude Code 서브에이전트 정의 3개(model: sonnet).
2. `.mcp.json` (레포 루트) — `playwright-test` MCP 서버 등록(`npx playwright run-test-mcp-server`).
3. `specs/` 디렉터리(레포 루트) — Planner가 테스트 계획을 저장하는 곳.
4. 시드 파일(빈 테스트 골격) — 에이전트가 "환경 셋업 방법"(예: 로그인)을 배우는 본보기 테스트. 기존에 없으면 기본 골격을 생성.
5. `--prompts` 옵션 시 `.claude/prompts/*.md` — `/playwright-test-plan` 같은 프롬프트 템플릿.

## 2. 우리 레포 상황과의 적합성 분석

### 잘 맞는 부분

- **Healer의 가치가 가장 명확하다.** 우리는 flaky를 burn-in으로 잡고 수리하는 규칙이 있는데, 지금은 실패 로그·트레이스를 사람이(또는 범용 AI가) 읽고 추론한다. Healer는 `test_debug`로 실패 지점에 브라우저를 멈춰 세우고 실제 DOM 스냅샷을 보며 고친다 — 최근 `board.spec.ts` webkit flaky 같은 사례에서 원인 파악이 훨씬 정확해질 수 있다.
- **Generator의 "실행하며 생성" 방식은 셀렉터 품질을 높인다.** 우리가 코드만 읽고 셀렉터를 추정해 burn-in에서 걸러내는 것과 달리, 생성 시점에 실제 DOM에 대고 검증한다. 전용 도구(`browser_generate_locator`)가 시멘틱 셀렉터를 우선 생성한다.
- **우리 목 스택과 호환된다.** MCP 서버는 `playwright.config.ts`를 그대로 읽으므로, webServer 배열(목 BE·목 WS·Next 프로덕션 빌드)이 자동 기동된다. 에이전트가 보는 화면도 목 기반 결정론적 환경이다.
- **Healer 내장 지침이 우리 규칙과 대체로 일치한다** — "networkidle 대기 금지, deprecated API 금지" 등이 명시돼 있다.

### 충돌하거나 주의할 부분

1. **`specs/` 루트 디렉터리 vs 우리 문서 규칙.** 우리는 "문서는 `docs/`에만"이 규칙인데, Planner는 레포 루트 `specs/`에 계획을 저장한다(도구에 하드코딩). 도입하면 "테스트 계획 md는 예외적으로 `specs/`" 를 규칙에 명시하거나, Planner 산출물을 `docs/test/`로 옮기는 후처리가 필요하다.
2. **Healer의 `test.fixme()` 자동 처리.** 확신이 안 서면 테스트를 skip 처리하고 넘어가도록 지침돼 있다 — 우리 "머지 전 수정" 원칙과 충돌 가능. Healer 결과물은 반드시 사람이 PR 리뷰로 확인해야 한다(자동 머지 금지).
3. **우리 컨벤션(카피 `MESSAGES` 단일 출처, `E2E_*` 결합 상수) 주입 필요.** 에이전트 정의는 범용이라 우리 레포 규칙을 모른다. Claude Code 서브에이전트는 CLAUDE.md(→AGENTS.md)를 읽으므로 기본은 커버되지만, 생성물이 리터럴을 쓰지 않는지 리뷰가 여전히 필요하다.
4. **시드 파일 커스터마이즈 필요.** 기본 시드는 빈 골격이다. 우리 인증 시작점(`loginAs` 쿠키 주입)을 시드에 담아야 에이전트가 인증 상태로 탐색을 시작할 수 있다.
5. **속도 비용.** MCP 서버가 세션마다 웹서버 스택(프로덕션 빌드 포함)을 기동하므로 에이전트 1회 구동이 무겁다(로컬 개발 시간 기준 1~2분+). CI에는 넣지 않고 로컬 개발 도구로만 쓰는 게 맞다.
6. **기존 워크플로우와의 중복.** 우리는 이미 SDD(스펙→플랜→서브에이전트 구현→리뷰)로 E2E를 만들고 있고 결과도 좋았다(카카오·채팅 E2E 모두 무 flaky 통과). 에이전트 도입은 이 흐름을 **대체**하는 게 아니라 "구현·수리 단계의 도구"로 편입하는 게 자연스럽다.

## 3. 도입 옵션

- **A) 전면 도입** — `init-agents` 실행 결과물을 커밋하고, 이후 E2E 작성은 Planner→Generator 흐름으로 전환. *리스크: 기존 SDD 흐름과 이중화, specs/ 규칙 충돌을 즉시 정리해야 함.*
- **B) 시험 도입 (권장)** — 결과물을 커밋하되 역할을 한정: **Healer를 flaky 수리에 우선 사용**하고, Generator는 다음 신규 커버리지 1건에서 시범 사용. 1~2회 사용 후 유지/확대/철회 판단. 시드 파일은 `loginAs` 기반으로 커스터마이즈. *리스크 낮음, 가치 검증 후 확대 가능.*
- **C) 보류** — 현행 SDD 흐름이 충분히 잘 돌아가므로 도입하지 않고 백로그 종결. *비용 0이지만, 실 DOM 기반 디버깅(Healer)의 가치를 포기.*

## 4. 권장안

**B) 시험 도입.** 근거:
- Healer는 현행 흐름에 없는 능력(실패 지점 라이브 디버깅)을 더한다 — 대체가 아니라 보강이라 충돌이 작다.
- 생성 파일은 전부 선언적 md/json이라 앱 코드·CI에 영향이 없고, 철회도 파일 삭제로 끝난다.
- 전면 전환(A)은 검증 없이 기존에 잘 작동하는 흐름을 흔든다. 보류(C)는 백로그에 올린 취지(검토 후 판단)에 비해 근거 없이 보수적이다.

## 5. 시험 도입 시 작업 목록 (승인 시 진행)

1. `npx playwright init-agents --loop=claude --prompts` 실행, 생성물 확인·커밋.
2. 시드 파일을 우리 인증 픽스처(`loginAs`) 기반으로 작성.
3. `AGENTS.md` E2E 섹션에 에이전트 사용 규칙 추가(Healer 결과물 리뷰 필수, `test.fixme()` 금지, specs/ 위치 예외 명시).
4. README 백로그 항목 갱신(검토 완료 → 시험 도입 상태 기록).

## 6. 참고 (확인 근거)

- 설치 버전: `@playwright/test` 1.61.1 (`init-agents` 명령 포함 확인).
- 에이전트 정의·생성 로직: `node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/lib/agents/` (planner/generator/healer `.agent.md`, `generateAgents.js`, `*.prompt.md`) 직접 열람.

## 7. 시범 결과 — Generator (2026-07-03)

> 대상: `middleware.ts` 인증 가드 커버리지. 시나리오 3개(미인증 `/dashboard`→`/login` 차단, 인증 시 `/login`·`/signup`→`/dashboard` 차단)로 `playwright-test-generator` 에이전트를 디스패치해 `e2e/tests/auth-guard.spec.ts` 생성. 계획: `docs/plans/e2e-auth-guard-generator-trial-20260703.md`.

### 7.1 생성물 품질 — 컨벤션 준수율 100%, 사람 수정 0건

Generator가 만든 `auth-guard.spec.ts`를 AGENTS.md E2E 규약 기준으로 리뷰한 결과 **위반 0건, 수정 불필요**:

| 규약 | 결과 |
|---|---|
| 시멘틱 셀렉터만 (`getByRole`) | ✅ CSS/DOM 셀렉터 없음 |
| 경로 리터럴 금지 → `PAGE_ROUTES` import | ✅ `/login` 등 리터럴 없음 |
| 하드 대기 금지 → `expect` auto-wait | ✅ `toHaveURL`+헤딩 단언 |
| 한국어 테스트 제목 | ✅ `test.describe("인증 가드")` |
| 인증 시작점 `loginAs` 픽스처 | ✅ 로그인 UI 미사용 |

시드(`seed.spec.ts`)의 `loginAs` 패턴을 정확히 학습해 인증 시나리오에 적용했고, 실제 브라우저로 3개 리다이렉트를 눈으로 확인한 뒤 코드를 썼다. 정적 검사(`pnpm lint`·`pnpm typecheck`)도 통과.

### 7.2 속도·소요

- **Generator 1회 구동: 약 3.9분**(14:53:28→14:57:43, 브라우저 도구 28회 호출). 5절에서 예상한 "무거움"과 일치 — MCP가 세션마다 웹서버 스택(프로덕션 빌드 포함)을 기동하기 때문.
- 기존 방식(SDD 서브에이전트 직접 작성) 대비 체감: 이 정도 단순 리다이렉트 3건은 손으로 짜도 빠르지만, **"실제 DOM을 보며 헤딩 텍스트를 확정"**하는 부분에서 추측 없이 정확했다. 값어치는 화면이 복잡하거나 셀렉터가 불확실한 커버리지에서 더 클 것.

### 7.3 실무 마찰 (평가 데이터) — 워크트리 환경에서의 비용

주목적(커버리지)과 별개로, **워크트리에서 Playwright 에이전트를 쓸 때의 마찰**이 시범의 절반이었다:

1. **워크트리 deps 미설치.** 워크트리가 `node_modules` 없이 생성돼 목 WS(`socket.io`) 기동 실패 → 수동 `pnpm install` 필요.
2. **MCP 서버 부팅 타이밍.** MCP 서버가 deps 설치 **이전**에 부팅되면 상위 프로젝트의 playwright 인스턴스를 잡아 `test() called here` 충돌 → **세션 재시작으로 해소**. deps가 있는 상태에서 시작하면 정상.
3. **MCP 스코프 = 체크아웃된 브랜치.** `.mcp.json`·`.claude/agents/`는 git 추적 파일이라 **PR #41을 포함한 브랜치**에만 물리적으로 존재한다. 워크트리(#41 포함 브랜치)에선 MCP가 붙지만, 상위 레포가 #41 미포함 브랜치면 안 붙는다. → main 머지 후 main 체크아웃 세션이면 어디서든 사용 가능.
4. **잔여 서버 프로세스.** Generator의 `setup_page`가 띄운 목 BE(:3099)·Next(:3000)가 종료 후에도 고정 포트에 남아, 이후 `playwright test`(`reuseExistingServer: false`)와 **포트 충돌**을 일으켰다. → 에이전트 구동 뒤 포트 정리 확인 필요.

### 7.4 검증 상태

- 정적: `pnpm lint`·`pnpm typecheck` ✅ 통과.
- e2e 단일 실행·burn-in·`pnpm e2e` 전체 회귀: 포트 3000을 **다른 테스트가 점유 중**이라(`NEXT_PORT` 하드코딩 + `reuseExistingServer: false`) 이 세션에서 미실행. **main 체크아웃 세션에서 이어서 검증** 예정.

### 7.5 판단

**Generator 시범 = 성공(생성물 품질 기준).** 규약 준수율 100%·사람 수정 0건으로 5절의 "리터럴 리뷰 필요" 우려를 이번 케이스에선 깔끔히 통과. 다만 **워크트리 환경 마찰(7.3)이 실측 비용**이라, 4절 권장안 **B(시험 도입)**의 "Generator 신규 커버리지 1건" 조건을 충족하되, 상시 도구화보다는 **deps가 갖춰진 main/브랜치 세션에서 화면이 복잡한 커버리지에 선택적으로** 쓰는 게 비용 대비 효율적이다. Healer 시범(나머지 절반)까지 본 뒤 최종 유지/확대/철회를 판단한다.
