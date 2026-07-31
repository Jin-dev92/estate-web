# README 화면 GIF 재현 방법

`docs/screenshots/screens.gif`를 다시 만드는 절차입니다. 화면을 고치면 이 GIF도 갱신해야 실제와 어긋나지 않습니다.

목 백엔드(`e2e/mock-be`)에 붙인 프로덕션 빌드를 Playwright로 찍고 ffmpeg로 합칩니다. 실 백엔드나 개발 서버(`next dev`)를 쓰지 않는 이유는 아래 "함정"에 있습니다.

## 1. 서버 세 개 띄우기

```bash
# 이전 서버가 남아 있으면 반드시 먼저 죽인다(아래 함정 2 참고)
lsof -ti:3000,3098,3099 | xargs kill 2>/dev/null

pnpm e2e:mock-be &   # :3099
pnpm e2e:mock-ws &   # :3098

# NEXT_PUBLIC_WS_URL은 빌드타임에 번들로 박힌다 — build에도 반드시 준다(함정 1)
BACKEND_URL=http://localhost:3099 \
NEXT_PUBLIC_WS_URL=http://localhost:3098 \
E2E_INSECURE_COOKIE=1 \
  pnpm build

BACKEND_URL=http://localhost:3099 \
NEXT_PUBLIC_WS_URL=http://localhost:3098 \
E2E_INSECURE_COOKIE=1 \
  pnpm start &        # :3000
```

확인:

```bash
curl -s localhost:3099/health && curl -s localhost:3098/health
grep -rl "localhost:3098" .next/static/chunks/ | head -1   # WS URL이 번들에 박혔는지
```

## 2. 프레임 찍기

레포 밖(예: `/tmp/shots/`)에 아래 두 파일을 두고 돌립니다. **`e2e/tests/`에 두지 마세요** — `playwright.config.ts`의 `testDir`이 그곳이라 `pnpm e2e`가 매번 스크린샷을 찍게 됩니다.

`gif.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: __dirname,
  testMatch: "gif.spec.ts",
  fullyParallel: true,
  workers: 4,
  timeout: 60_000,
  reporter: "list",
  use: { baseURL: "http://localhost:3000" },
  // GIF 프레임 크기 = 이 뷰포트. fullPage를 쓰지 않으므로 모든 프레임이 같은 크기다(함정 3).
  projects: [
    { name: "gif", use: { ...devices["Desktop Chrome"], viewport: { width: 1200, height: 750 } } },
  ],
});
```

`gif.spec.ts`: 아래 화면들을 순서대로 찍습니다. 파일명 앞 번호가 GIF 프레임 순서입니다(ffmpeg가 glob을 정렬해 씁니다).

| 프레임 | 경로 | 역할 |
|---|---|---|
| 01-login | `/login` | 비로그인 |
| 02-dashboard-tenant | `/dashboard` | `loginAs` |
| 03-board-list | `/board/{E2E_BOARD.buildingId}` | `loginAs` |
| 04-board-post | `/board/{buildingId}/{postId}` | `loginAs` |
| 05-chat-room | `/chat/{E2E_CHAT.roomId}` | 아래 참고 |
| 06-notifications | `/notifications` | `loginAs` |
| 07-settings | `/settings` | `loginAs` |
| 08-dashboard-owner | `/dashboard` | `loginAsOwner` |
| 09-buildings | `/buildings` | `loginAsOwner` |
| 10-building-detail | `/buildings/{E2E_BUILDING.id}` | `loginAsOwner` |

인증은 `e2e/fixtures/auth.ts`의 `loginAs`·`loginAsOwner`로 쿠키를 주입합니다. 경로는 `PAGE_ROUTES`, 결합 식별자는 `e2e/fixtures/e2e-constants.ts`에서 가져옵니다(리터럴 하드코딩 금지).

기본 프레임 함수:

```ts
async function frame(page: Page, context: BrowserContext, name: string, path: string, role: Role) {
  if (role === "tenant") await loginAs(context);
  if (role === "owner") await loginAsOwner(context);
  await page.goto(path);
  // 알림 provider가 WebSocket을 계속 열어두는 화면은 networkidle이 오지 않는다.
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
  await page.screenshot({ path: `${OUT}/${name}.png` });
}
```

**채팅방 프레임은 빈 방이 아니라 실제 대화를 담습니다.** 두 브라우저 컨텍스트(입주자·건물주)를 같은 방에 넣고 메시지를 주고받은 뒤 건물주 쪽에서 찍습니다. 목 BE가 OWNER에게만 방 목록을 주기 때문에(설계상) 건물주 화면에서만 "건물명 · 상대역할" 제목이 뜹니다.

```ts
const room = PAGE_ROUTES.chatRoom(E2E_CHAT.roomId);
await tenant.goto(room);
await owner.goto(room);
await tenant.getByPlaceholder(MESSAGES.chat.inputPlaceholder).fill("...");
await expect(tenant.getByRole("button", { name: "전송" })).toBeEnabled();  // 연결을 기다린다
await tenant.getByRole("button", { name: "전송" }).click();
await expect(owner.getByText("...", { exact: false })).toBeVisible();      // 상대에 도착 확인
```

실행:

```bash
SHOT_DIR=/tmp/shots/frames pnpm exec playwright test --config /tmp/shots/gif.config.ts
```

## 3. GIF 합치기

```bash
cd /tmp/shots/frames
ffmpeg -y -framerate 1/2.2 -pattern_type glob -i '*.png' \
  -vf "scale=1000:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3" \
  -loop 0 screens.gif
cp screens.gif <repo>/docs/screenshots/screens.gif
```

- `framerate 1/2.2` — 프레임당 2.2초. 10프레임이면 총 22초.
- `scale=1000` — README 표시 폭과 맞춘다. 원본 1200px을 줄여 용량을 절반으로 낮춘다.
- `max_colors=128` + `dither=bayer` — 이 UI는 색이 적어 128색으로도 밴딩이 없다. 209KB 정도가 나온다.

## 함정 (전부 실제로 겪은 것)

**1. `NEXT_PUBLIC_WS_URL`은 빌드타임에 박힌다.** `lib/chat/ws.ts`가 `process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001"`이라, `pnpm build`에 이 값을 주지 않으면 클라이언트가 3001(실 백엔드)로 붙으려다 실패하고 채팅 화면에 "실시간 연결에 실패했어요" 배너가 찍힙니다. `pnpm start`에만 주고 `build`에 빼먹으면 이 증상이 납니다.

**2. 재빌드 후 옛 서버를 반드시 죽인다.** `pnpm build`가 `.next`를 새로 만들면 CSS 청크 해시가 바뀝니다. 포트 3000을 잡고 있던 옛 서버는 옛 HTML(옛 CSS 경로)을 서빙하는데 그 파일이 사라져 **스타일이 전혀 없는 화면**이 찍힙니다. 새 `pnpm start`는 `EADDRINUSE`로 조용히 죽어 있고요. `lsof -ti:3000 | xargs kill`로 먼저 비웁니다.

**3. `fullPage: true`를 쓰지 않는다.** 화면마다 콘텐츠 높이가 달라 프레임 크기가 어긋나고 GIF가 깨집니다. 고정 뷰포트로 찍습니다.

**4. `networkidle`을 그냥 기다리면 타임아웃 난다.** 알림 provider가 WebSocket을 열어두는 화면은 idle 상태가 오지 않습니다. 타임아웃을 주고 `.catch(() => {})`로 넘긴 뒤 찍습니다(렌더는 이미 끝나 있습니다).
