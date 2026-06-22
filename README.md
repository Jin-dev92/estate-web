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
| **FE-M1** | 대시보드 홈 (OWNER / TENANT) | 예정 |
| **FE-M2** | 건물 · 호실 · 초대코드 관리 (OWNER) | 예정 |
| **FE-M3** | 게시판 (목록 · 상세 · 작성) | 예정 |
| **FE-M4** | 1:1 채팅 (WebSocket 실시간) | 예정 |
| **FE-M5** | 알림 센터 | 예정 |
| **FE-M6** | 설정 · 프로필 | 예정 |

> 후속(F): OAuth 소셜 로그인, 채팅 자동 번역 — 백엔드 F1 · F2에 맞춰 추가.

## 시작하기

```bash
npm install
npm run dev      # http://localhost:3000 (개발 서버)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
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
