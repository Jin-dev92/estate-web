# 터전 — estate-web (FE)

건물주와 입주자를 잇는 커뮤니케이션 플랫폼 **터전**의 프론트엔드입니다.
백엔드 [estate-server](https://github.com/Jin-dev92/estate-server)(NestJS · Prisma · Kafka)의
**git 서브모듈**(`web/`)로 관리됩니다.

## 화면

<p align="center">
  <img src="docs/screenshots/screens.gif" alt="터전 주요 화면 — 로그인, 입주자 대시보드, 게시판, 게시글, 채팅, 알림, 설정, 건물주 대시보드, 건물 관리, 호실 관리" width="1000">
</p>

로그인 → 입주자 대시보드 → 게시판 → 게시글 → 1:1 채팅 → 알림 → 설정 → 건물주 대시보드 → 건물 관리 → 호실 관리 순서로 전환됩니다.
Playwright로 프로덕션 빌드를 목 백엔드에 붙여 찍었습니다(`docs/guides/screenshots.md`).

## 스택

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS v4** — 디자인 토큰을 CSS 변수로 두고 `@theme`로 매핑
- **TanStack Query v5** · **React Hook Form** · **Zod**
- **Socket.IO** — 채팅·알림 실시간 이벤트
- **Vitest** · **Playwright** — 단위/컴포넌트 테스트와 핵심 사용자 흐름 E2E
- **Pretendard** (가변 폰트, 한국어)

## 주요 기능

백엔드 도메인(estate-server)과 1:1로 대응하며 전 영역 구현을 마쳤습니다.

- **온보딩** — 로그인·역할 선택·건물주 가입·입주자 초대 통합 가입, 카카오 OAuth, httpOnly 세션
- **대시보드** — OWNER/TENANT 역할별 홈
- **건물 관리** — 건물·호실·초대코드 발급 (OWNER)
- **게시판** — 목록·상세·작성·댓글·좋아요 낙관적 토글
- **1:1 채팅** — Socket.IO 실시간, 재연결 대응
- **알림 센터** — 실시간 수신·단건/전체 읽음·딥링크
- **설정** — 프로필 이름 수정·비밀번호 변경·로그아웃

> 후속: 채팅 자동 번역 — 백엔드 F2에 맞춰 추가.

## 디자인 시스템

메인 브랜드 컬러는 **딥 틸그린 `#1F8A70`** (집·안심·신뢰). 레퍼런스 톤은 토스(명료)·당근(온기)·Airbnb(사진/카드 위계).
모든 토큰(컬러·타이포·공간·모션)은 `app/globals.css`의 `:root` CSS 변수가 단일 출처이며 Tailwind 유틸로 매핑됩니다.

설계 스펙은 백엔드 레포에 있습니다 — [디자인 시스템](https://github.com/Jin-dev92/estate-server/blob/main/docs/superpowers/specs/frontend/2026-06-22-design-system-design.md) · [온보딩](https://github.com/Jin-dev92/estate-server/blob/main/docs/superpowers/specs/2026-06-22-onboarding-design.md) · [FE 스펙 전체](https://github.com/Jin-dev92/estate-server/tree/main/docs/superpowers/specs/frontend)

## 테스트

| 종류 | 범위 |
|---|---|
| **Vitest** | 단위·컴포넌트 (앱 코드 + 테스트 파일 모두 `typecheck` 대상) |
| **Playwright** | 핵심 사용자 흐름 E2E — chromium·firefox·webkit 3개 엔진 |

E2E는 목 BE(HTTP)와 목 Socket.IO 서버로 결정론적으로 돕니다. `pnpm e2e`가 목 서버들과 Next 프로덕션 빌드를 자동 기동합니다. 인증은 세션 쿠키를 주입하는 `loginAs`/`loginAsOwner` 픽스처로 시작합니다. 셀렉터는 시멘틱만 쓰고, flaky는 burn-in으로 차단합니다.

목 응답은 `lib/api` 도메인 타입에 묶여 있어(**drift 게이트**) 백엔드 계약이 바뀌면 `typecheck`가 잡습니다. 게시판·프로필·알림은 상태있는 목이라 작성→반영(영속성)까지 검증합니다.

상세 규약과 한계는 [`AGENTS.md`](AGENTS.md)의 E2E 절, 시나리오별 스펙은 [`docs/test/`](docs/test/)에 있습니다.

## 시작하기

Node.js 20.9 이상이 필요합니다(Next.js 16 요구사항). pnpm 버전은 `packageManager` 필드로 고정돼 있어 Corepack이 맞춰줍니다.

이 레포는 estate-server의 `web/` 서브모듈입니다. **개발은 부모 레포의 `web/` 안에서 진행합니다.**

```bash
git clone --recurse-submodules https://github.com/Jin-dev92/estate-server.git
cd estate-server/web        # 이미 클론했다면: git submodule update --init --recursive

corepack enable
pnpm install
pnpm dev                    # http://localhost:3000
```

목 백엔드로 도는 E2E와 달리 개발 서버는 `http://localhost:3001`에 실 `estate-server`가 떠 있어야 데이터가 보입니다.

### 환경변수

프로젝트 루트에 `.env.local`을 만듭니다. 아래 값은 모두 선택 사항이며 미설정 시 백엔드와 WebSocket은 `http://localhost:3001`을 사용합니다.

```dotenv
# 서버 컴포넌트와 Route Handler에서만 사용하는 백엔드 주소
BACKEND_URL=http://localhost:3001

# 브라우저에서 사용하는 Socket.IO 서버 주소
NEXT_PUBLIC_WS_URL=http://localhost:3001

# 카카오 OAuth JavaScript 앱 키
NEXT_PUBLIC_KAKAO_CLIENT_ID=
```

> `NEXT_PUBLIC_*` 변수는 브라우저 번들에 공개됩니다. 비밀 키나 서버 자격 증명은 이 접두사에 넣지 말고 서버 전용 환경변수와 백엔드에서 관리하세요.

### 실행 및 검증

| 명령 | 설명 |
|---|---|
| `pnpm dev` | `http://localhost:3000`에서 개발 서버 실행 |
| `pnpm build` | 프로덕션 빌드 생성 |
| `pnpm start` | 프로덕션 서버 실행 |
| `pnpm lint` | ESLint 검사 |
| `pnpm test` | Vitest 단위·컴포넌트 테스트 |
| `pnpm typecheck` | TypeScript 타입 검사 (앱 `tsconfig.json` + 테스트 `tsconfig.vitest.json` 두 프로그램) |
| `pnpm e2e` | 목 BE·WS와 프로덕션 빌드를 사용한 Playwright E2E |
| `pnpm e2e:ui` | Playwright UI 모드 실행 |
| `pnpm e2e:burn` | 전 E2E를 5회 반복해 flaky 여부 확인 |

## 애플리케이션 구성

페이지 조회는 Server Component가 백엔드를 직접 호출합니다. 브라우저에서 발생하는 쓰기 요청은 같은 출처의 Next.js Route Handler(`/api/*`)를 거쳐 `estate-server`로 전달되며 세션 토큰은 httpOnly 쿠키로 관리합니다. 채팅과 알림만 `NEXT_PUBLIC_WS_URL`의 Socket.IO 서버에 연결합니다.

```text
브라우저
  ├─ 페이지 요청 ──> Next.js Server Component ──> estate-server
  ├─ 쓰기 요청 ───> Next.js Route Handler ─────> estate-server
  └─ 실시간 연결 ─> Socket.IO ─────────────────> estate-server
```

## 구조

디렉토리 이름으로 짐작되지 않는 것만 적습니다.

```text
app/(app)/            # 인증 후 화면. 이 레이아웃이 세션 가드 역할을 한다
app/api/              # 브라우저 쓰기 요청을 백엔드로 중계하는 Route Handler
proxy.ts              # Next 16 proxy(구 middleware) — 액세스 토큰 자동 갱신
lib/constants.ts      # 경로·역할·쿠키 키 단일 출처 (리터럴 하드코딩 금지)
lib/messages.ts       # 사용자 노출 문구 단일 출처
lib/api/              # 도메인별 백엔드 클라이언트. client.ts가 공유 인프라
e2e/mock-be/          # E2E용 HTTP 백엔드 (MOCK_SHOWCASE=1이면 스크린샷용 데이터)
e2e/fixtures/         # 인증 픽스처와 타입드 목 데이터(drift 게이트)
```
