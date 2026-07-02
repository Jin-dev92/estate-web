# 터전 — estate-web (FE)

건물주와 입주자를 잇는 커뮤니케이션 플랫폼 **터전**의 프론트엔드입니다.
백엔드 [estate-server](https://github.com/Jin-dev92/estate-server-kafka)(NestJS · Prisma · Kafka)의
**git 서브모듈**(`web/`)로 관리됩니다.

## 스택

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS v4** — 디자인 토큰을 CSS 변수로 두고 `@theme`로 매핑
- **Pretendard** (가변 폰트, 한국어)

## 디자인 시스템

메인 브랜드 컬러는 **딥 틸그린 `#1F8A70`** (집·안심·신뢰). 레퍼런스 톤은 토스(명료)·당근(온기)·Airbnb(사진/카드 위계).
모든 토큰(컬러·타이포·공간·모션)은 `app/globals.css`의 `:root` CSS 변수가 단일 출처이며 Tailwind 유틸로 매핑됩니다.

- 디자인 시스템 스펙: estate-server `docs/superpowers/specs/2026-06-22-design-system-design.md`
- 온보딩 설계 스펙: estate-server `docs/superpowers/specs/2026-06-22-onboarding-design.md`

## 마일스톤

화면을 영역별로 끊어 순차 구현합니다. 백엔드 도메인(estate-server)과 1:1로 대응합니다.

| 단계 | 화면 / 기능 | 상태 |
|---|---|---|
| **FE-M0** | 온보딩 — 로그인 · 역할 선택 · 건물주 가입 · 입주자 초대 통합 가입 · httpOnly 세션 | ✅ 구현 |
| **FE-M1** | 대시보드 홈 (OWNER / TENANT) | ✅ 구현 |
| **FE-M2** | 건물 · 호실 · 초대코드 관리 (OWNER) | ✅ 구현 |
| **FE-M3** | 게시판 (목록 · 상세 · 작성) | ✅ 구현 |
| **FE-M4** | 1:1 채팅 (WebSocket 실시간) | ✅ 구현 |
| **FE-M5** | 알림 센터 (실시간 · 단건/전체 읽음 · 딥링크) | ✅ 구현 |
| **FE-M6** | 설정 · 프로필 (이름 수정 · 비밀번호 변경 · 로그아웃) | ✅ 구현 |

> 후속(F): OAuth 소셜 로그인, 채팅 자동 번역 — 백엔드 F1 · F2에 맞춰 추가.

## E2E 테스트 (Playwright)

목 BE 서버(`BACKEND_URL`) 기반 결정론적 E2E. `loginAs` prefill 픽스처로 인증 상태 시작, 시멘틱 셀렉터·burn-in으로 flaky 차단. `pnpm e2e`로 목 BE + Next를 자동 기동. 상세 규약은 `AGENTS.md`의 E2E 섹션 참고.

| 커버리지 | 상태 |
|---|---|
| 로그인 스모크 (성공→대시보드 / 실패→에러) | ✅ |
| 온보딩 가입 (건물주 가입→대시보드 · 입주자 초대코드 미리보기→가입→입주 · 무효 코드 에러) | ✅ |
| 설정 (프로필 렌더 · 이름 수정 · 로그아웃) | ✅ |
| 건물·호실 (OWNER: 건물 목록→상세 호실 · 초대코드 발급→코드 노출) | ✅ |
| 게시판 (목록 · 상세 · 글/댓글 작성) | ✅ |
| 알림 센터 (목록 렌더 · 단건 읽음+딥링크 · 전체 읽음) | ✅ |
| 목 BE 타입 drift 게이트 (`tsc --noEmit`로 `lib/api` 계약 변경 검출) | ✅ |

### 후속 백로그

- [ ] **테스트 typecheck 정비**: `tsconfig.vitest.json` 분리 + `vi.fn()` 파라미터 타입화(약 44건) + `**/*.test.*` exclude 제거 — 현재 루트 tsconfig의 `types:["vitest/globals"]` 스톱갭 해소.
- [ ] **`MESSAGES.auth.login` 신설**: 로그인 버튼 카피 단일 출처화(로그인 페이지·E2E 스펙에서 `"로그인"` 리터럴 제거).
- [ ] **상태있는 목 옵션**: 작성 글/댓글·프로필 수정·알림 읽음이 목록에 반영되는지 영속성 단언(현재 무상태라 성공경로 스모크만).
- [ ] **drift 게이트 확장**: leases · buildings 플로우가 실 픽스처로 채워지면 `mockLease()`·`mockBuilding()` 등 타입드 빌더로 편입(알림은 `mockNotifications()`로 편입 완료).
- [ ] **공식 에이전트 도입 검토**: Playwright Planner/Generator/Healer(`init-agents`).
- [ ] **멀티브라우저**: webkit · firefox 프로젝트 추가.

> 백엔드(estate-server) 후속: `prisma-account` repo의 `provider` 런타임 검증(현재 KAKAO만이라 저위험) — estate-server 백로그로 관리.

## 시작하기

> 패키지 매니저는 **pnpm**입니다(`packageManager` 필드로 버전 고정 — `corepack enable`로 자동 사용).

```bash
pnpm install
pnpm dev         # http://localhost:3000 (개발 서버)
pnpm build       # 프로덕션 빌드
pnpm lint        # ESLint
```

## 서브모듈로 클론하기

이 레포는 estate-server의 `web/` 서브모듈입니다. 부모 레포와 함께 받으려면:

```bash
git clone --recurse-submodules https://github.com/Jin-dev92/estate-server-kafka.git
# 이미 클론했다면
git submodule update --init --recursive
```

> 개발은 부모 레포의 `web/`(이 서브모듈) 안에서 진행합니다.

## 구조

```
app/
  globals.css   # 디자인 시스템 v0 토큰(:root CSS 변수) + Tailwind @theme 매핑
  layout.tsx    # 루트 레이아웃(Pretendard, 라이트 모드)
  page.tsx      # 브랜드 진입 placeholder (로그인/회원가입 CTA)
```

온보딩(FE-M0) 화면은 구현됐습니다. 이후 단계는 위 **마일스톤** 표를 참고하세요.
