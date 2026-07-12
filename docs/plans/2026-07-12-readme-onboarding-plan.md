# README 온보딩 개편 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 신규 개발자가 README만으로 프로젝트 구성, 환경 설정, 실행 및 검증 방법을 파악할 수 있도록 현재 저장소 상태에 맞게 문서를 개편한다.

**Architecture:** 애플리케이션 코드는 건드리지 않고 `README.md`의 정보 구조와 사실만 갱신한다. `package.json`, 환경변수 참조 코드, 실제 디렉터리 구조를 단일 검증 근거로 사용한다.

**Tech Stack:** Markdown, Next.js 16, React 19, TypeScript, pnpm, Vitest, Playwright

## Global Constraints

- 변경 범위는 `README.md`와 이 작업의 근거 문서로 제한한다.
- 환경변수 이름과 명령은 현재 코드 및 `package.json`과 정확히 일치해야 한다.
- `BACKEND_URL`은 서버 전용이고 `NEXT_PUBLIC_*`는 브라우저에 노출됨을 명시한다.
- 기존 마일스톤, E2E 커버리지, 백로그 정보는 보존하되 중복 표현만 줄인다.

---

### Task 1: README 온보딩 정보 개편

**Files:**
- Modify: `README.md`
- Reference: `package.json`
- Reference: `lib/env.ts`
- Reference: `lib/chat/ws.ts`
- Reference: `lib/constants.ts`

**Interfaces:**
- Consumes: 현재 npm scripts, 환경변수 기본값, 실제 디렉터리 구조
- Produces: 설치부터 검증까지 재현 가능한 저장소 진입 문서

- [ ] **Step 1: README의 오래된 정보 교체**

  요구사항, 환경변수, 명령 표, 애플리케이션 호출 흐름, 실제 디렉터리 구조를 추가하고 초기 placeholder 설명을 제거한다. 게시글 좋아요 기능을 현재 기능 현황에 반영한다.

- [ ] **Step 2: 문서 사실 검증**

  Run: `rg -n "BACKEND_URL|NEXT_PUBLIC_WS_URL|NEXT_PUBLIC_KAKAO_CLIENT_ID|pnpm (dev|build|lint|test|typecheck|e2e)" README.md package.json lib app playwright.config.ts`

  Expected: README에 적힌 환경변수와 명령이 코드 및 설정의 실제 이름과 일치한다.

- [ ] **Step 3: Markdown 변경 검토**

  Run: `git diff --check`

  Expected: 출력 없이 종료 코드 0.

- [ ] **Step 4: 저장소 검증**

  Run: `pnpm lint`

  Expected: ESLint 오류 없이 종료 코드 0.

  Run: `pnpm typecheck`

  Expected: TypeScript 오류 없이 종료 코드 0.

- [ ] **Step 5: 커밋**

  ```bash
  git add README.md docs/plans/2026-07-12-readme-onboarding-design.md docs/plans/2026-07-12-readme-onboarding-plan.md
  git commit -m "docs: README 온보딩 정보 최신화"
  ```

### Task 2: 브랜치 게시 및 PR 생성

**Files:**
- Reference: `docs/plans/2026-07-12-readme-onboarding-design.md`
- Reference: `docs/plans/2026-07-12-readme-onboarding-plan.md`

**Interfaces:**
- Consumes: 검증 및 커밋된 README 변경
- Produces: `dev` 기준으로 rebase된 작업 브랜치와 한글 PR

- [ ] **Step 1: 작업 브랜치 확인 및 원격 갱신**

  Run: `git branch --show-current`

  Expected: 보호 브랜치가 아닌 `docs/*` 작업 브랜치.

  Run: `git fetch origin`

  Expected: 원격 참조 갱신 성공.

- [ ] **Step 2: base 브랜치에서 rebase**

  Run: `git rebase origin/dev`

  Expected: 충돌 없이 최신 `dev` 위로 rebase 완료.

- [ ] **Step 3: 브랜치 push**

  Run: `git push --force-with-lease -u origin docs/readme-onboarding-20260712`

  Expected: 원격 작업 브랜치 갱신 성공.

- [ ] **Step 4: 한글 PR 생성**

  PR 제목은 `docs: README 온보딩 정보 최신화`로 작성한다. 본문에는 변경 요약, 검증 결과, 설계·계획 문서 경로, 프로젝트 체크리스트를 포함하고 base는 `dev`로 지정한다.
