# 게시글 좋아요 FE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**설계 스펙:** [`docs/frontend/2026-07-04-post-like-design.md`](../frontend/2026-07-04-post-like-design.md)
**백엔드 계약:** estate-server PR #80 (`POST`/`DELETE /posts/:postId/likes` → `{ postId, liked, likeCount }`; `GET /posts/:id`·`GET /buildings/:id/posts`에 `likeCount`·`likedByMe` 포함)

**Goal:** 게시글 상세·목록에서 좋아요 수/내가 눌렀는지를 표시하고, 하트 버튼으로 낙관적 토글(성공 시 서버 카운트 보정, 실패 시 롤백)한다.

**Architecture:** 게시판 페이지는 RSC라 초기 좋아요 값은 props로 내려온다. 낙관적 상태는 `LikeButton`의 로컬 `useState`로 시드하고, `useToggleLike`(React Query `useMutation`)는 BFF 호출의 async 라이프사이클만 담당한다. BFF(`app/api/posts/[id]/likes`)가 세션 쿠키→Bearer로 `BACKEND_URL`에 프록시한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, @tanstack/react-query v5, Vitest + @testing-library/react.

## Global Constraints

- 파일은 `.ts`/`.tsx`만. 함수형 컴포넌트만.
- 매직 스트링 금지: API 라우트는 `API_ROUTES`(`lib/constants.ts`), 사용자 문구는 `MESSAGES`(`lib/messages.ts`).
- `as any`·index signature·`enum` 금지. Boolean은 strict equality(`=== true`).
- `"use client"`는 상호작용 컴포넌트에만 최소 범위.
- 커밋 메시지: `type: 내용`(estate-web 규칙). 백엔드식 `[M2]` 접두어 금지.
- 검증 게이트(PR 전): `npm run test`·`npm run typecheck`·`npm run lint`·`npm run build` 전부 통과.

---

## File Structure

- `lib/api/client.ts` (수정) — `authDelete<T>` 헬퍼 추가.
- `lib/api/board.ts` (수정) — `Post` 타입에 `likeCount`·`likedByMe`, `backendLikePost`/`backendUnlikePost` 추가.
- `lib/constants.ts` (수정) — `API_ROUTES.postLikes(id)` 추가.
- `lib/messages.ts` (수정) — `MESSAGES.board.like`·`MESSAGES.board.likeFailed` 추가.
- `app/api/posts/[id]/likes/route.ts` (신규) — BFF `POST`/`DELETE`.
- `lib/query/mutations/like.ts` (신규) — `useToggleLike`.
- `components/board/like-button.tsx` (신규) — `"use client"` 하트 토글 버튼.
- `components/board/like-button.test.tsx` (신규) — 낙관적/보정/롤백/취소 테스트.
- `components/board/post-list-item.tsx` (수정) — 좋아요 props + compact 버튼.
- `app/(app)/board/[buildingId]/page.tsx` (수정) — 목록에 값 전달.
- `app/(app)/board/[buildingId]/[postId]/page.tsx` (수정) — 상세에 full 버튼.

---

### Task 1: 데이터 레이어 (authDelete + board 타입/함수)

**Files:**
- Modify: `lib/api/client.ts`
- Modify: `lib/api/board.ts`

**Interfaces:**
- Consumes: 기존 `call<T>`, `authPost<T>`, `authGet<T>`.
- Produces:
  - `authDelete<T>(path: string, token: string, errorMap?: Record<number, string>): Promise<T>`
  - `Post` 타입에 `likeCount: number; likedByMe: boolean` 필드.
  - `backendLikePost(t: string, postId: string): Promise<{ postId: string; liked: boolean; likeCount: number }>`
  - `backendUnlikePost(t: string, postId: string): Promise<{ postId: string; liked: boolean; likeCount: number }>`

이 레이어는 기존 `authPost`/`backendCreateComment`와 동일하게 얇은 래퍼라 전용 단위 테스트 없이 `typecheck`로 검증한다(선례 따름). 행동 검증은 Task 5의 컴포넌트 테스트가 담당.

- [ ] **Step 1: `authDelete` 추가** — `lib/api/client.ts`의 `authPatch` 아래에 추가:

```ts
// 인증 DELETE — body 없음(좋아요 취소 등)
export function authDelete<T>(path: string, token: string, errorMap: Record<number, string> = {}) {
  return call<T>(path, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  }, errorMap);
}
```

- [ ] **Step 2: `Post` 타입 확장** — `lib/api/board.ts`의 `Post` 타입에 필드 추가:

```ts
export type Post = {
  id: string;
  category: PostCategory;
  title: string;
  authorId: string;
  createdAt?: string;
  likeCount: number;
  likedByMe: boolean;
};
```

`PostDetail = Post & {...}`이므로 자동 상속(추가 정의 불필요).

- [ ] **Step 3: 좋아요 backend 함수 추가** — `lib/api/board.ts` import에 `authDelete` 추가하고 파일 하단에:

```ts
type LikeResult = { postId: string; liked: boolean; likeCount: number };

export const backendLikePost = (t: string, postId: string) =>
  authPost<LikeResult>(`/posts/${postId}/likes`, t);

export const backendUnlikePost = (t: string, postId: string) =>
  authDelete<LikeResult>(`/posts/${postId}/likes`, t);
```

import 라인: `import { authGet, authPost, authDelete } from "./client";`

- [ ] **Step 4: typecheck** — Run: `npm run typecheck`. Expected: PASS (배럴 `lib/api/index.ts`가 `./client`·`./board`를 re-export하므로 새 심볼 자동 노출).

- [ ] **Step 5: Commit**

```bash
git add lib/api/client.ts lib/api/board.ts
git commit -m "feature: 좋아요 데이터 레이어(authDelete·backendLike/Unlike) 추가"
```

---

### Task 2: 상수·메시지

**Files:**
- Modify: `lib/constants.ts`
- Modify: `lib/messages.ts`

**Interfaces:**
- Produces:
  - `API_ROUTES.postLikes: (id: string) => string` → `/api/posts/${id}/likes`
  - `MESSAGES.board.like: string` (`"좋아요"` — 버튼 aria-label)
  - `MESSAGES.board.likeFailed: string`

- [ ] **Step 1: API 라우트 추가** — `lib/constants.ts`의 `API_ROUTES`에서 `postComments` 라인 아래:

```ts
  postComments: (id: string) => `/api/posts/${id}/comments`,
  postLikes: (id: string) => `/api/posts/${id}/likes`,
```

- [ ] **Step 2: 메시지 추가** — `lib/messages.ts`의 `board` 블록에 추가:

```ts
  board: {
    createFailed: "글 작성에 실패했어요. 잠시 후 다시 시도해주세요.",
    noBuildingTenant: "연결된 건물이 없어요",
    noBuildingOwner: "건물을 먼저 등록하세요",
    postNotFound: "글을 찾을 수 없어요",
    empty: "아직 글이 없어요",
    like: "좋아요",
    likeFailed: "좋아요 처리에 실패했어요. 잠시 후 다시 시도해주세요.",
  },
```

- [ ] **Step 3: typecheck** — Run: `npm run typecheck`. Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/constants.ts lib/messages.ts
git commit -m "feature: 좋아요 API 라우트·메시지 상수 추가"
```

---

### Task 3: BFF 라우트 (`/api/posts/[id]/likes`)

**Files:**
- Create: `app/api/posts/[id]/likes/route.ts`

**Interfaces:**
- Consumes: `getToken`(`@/lib/session`), `backendLikePost`·`backendUnlikePost`·`ApiError`(`@/lib/api`).
- Produces: `POST`/`DELETE` 핸들러. 응답 `{ postId, liked, likeCount }` 또는 에러 `{ message, status }`.

`comments/route.ts` 패턴을 그대로 미러(얇은 프록시 → 전용 단위 테스트 없이 typecheck·build로 검증).

- [ ] **Step 1: 라우트 생성** — `app/api/posts/[id]/likes/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getToken } from "@/lib/session";
import { backendLikePost, backendUnlikePost, ApiError } from "@/lib/api";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getToken();
  if (!token) return NextResponse.json({ message: "인증 필요" }, { status: 401 });
  try {
    const { id } = await params;
    const result = await backendLikePost(token, id);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const err = e as ApiError;
    return NextResponse.json({ message: err.message, status: err.status }, { status: err.status ?? 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getToken();
  if (!token) return NextResponse.json({ message: "인증 필요" }, { status: 401 });
  try {
    const { id } = await params;
    const result = await backendUnlikePost(token, id);
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    const err = e as ApiError;
    return NextResponse.json({ message: err.message, status: err.status }, { status: err.status ?? 500 });
  }
}
```

- [ ] **Step 2: typecheck** — Run: `npm run typecheck`. Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/api/posts/[id]/likes/route.ts
git commit -m "feature: 좋아요 BFF 라우트(POST·DELETE) 추가"
```

---

### Task 4: 뮤테이션 훅 (`useToggleLike`)

**Files:**
- Create: `lib/query/mutations/like.ts`

**Interfaces:**
- Consumes: `API_ROUTES.postLikes`(`@/lib/constants`), `MESSAGES.board.likeFailed`(`@/lib/messages`), `useMutation`.
- Produces: `useToggleLike(): UseMutationResult`. 입력 `{ postId: string; like: boolean }`, 결과 `{ liked: boolean; likeCount: number }`.

`chat.ts`의 `useEnsureRoom` 구조 미러. 행동은 Task 5 컴포넌트 테스트에서 fetch 모킹으로 검증.

- [ ] **Step 1: 훅 생성** — `lib/query/mutations/like.ts`:

```ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { API_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

type ToggleLikeInput = { postId: string; like: boolean };
type ToggleLikeResult = { liked: boolean; likeCount: number };

// POST(좋아요)/DELETE(취소) BFF 프록시. 실패 시 서버 메시지(없으면 기본 카피)로 throw.
async function toggleLike({ postId, like }: ToggleLikeInput): Promise<ToggleLikeResult> {
  const res = await fetch(API_ROUTES.postLikes(postId), {
    method: like ? "POST" : "DELETE",
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? MESSAGES.board.likeFailed);
  }
  return res.json();
}

export function useToggleLike() {
  return useMutation({ mutationFn: toggleLike });
}
```

- [ ] **Step 2: typecheck** — Run: `npm run typecheck`. Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/query/mutations/like.ts
git commit -m "feature: useToggleLike 뮤테이션 훅 추가"
```

---

### Task 5: LikeButton 컴포넌트 (TDD)

**Files:**
- Create: `components/board/like-button.tsx`
- Test: `components/board/like-button.test.tsx`

**Interfaces:**
- Consumes: `useToggleLike`(`@/lib/query/mutations/like`), `MESSAGES.board.like`.
- Produces: `LikeButton(props: { postId: string; initialLikeCount: number; initialLikedByMe: boolean; variant?: "full" | "compact" })`.

핵심 설계:
- 로컬 `useState`로 `liked`·`count`를 props 시드.
- 클릭: 스냅샷 저장 → 낙관적 토글(`liked` 반전, `count ± 1`) → `mutate`. `onSuccess`는 서버 `likeCount`로 `count` 보정, `onError`는 스냅샷 롤백.
- 버튼 접근성: `aria-label={MESSAGES.board.like}`, `aria-pressed={liked}`. 카운트는 텍스트로 표시.
- compact(목록)에서는 Link 내부이므로 `onClick`에서 `preventDefault`+`stopPropagation`.

React Query `useMutation`을 쓰므로 테스트는 `QueryClientProvider`(retry:false)로 감싸 렌더한다(기존 테스트에 react-query 래퍼 선례 없음 → 이 파일에서 헬퍼 신설).

- [ ] **Step 1: 실패 테스트 작성** — `components/board/like-button.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import { LikeButton } from "./like-button";

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

// 제어 가능한 지연 응답: 낙관적 상태를 응답 전에 관찰하기 위함.
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function okResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

afterEach(() => vi.restoreAllMocks());

it("초기 렌더: initialLikeCount·initialLikedByMe를 반영한다", () => {
  renderWithClient(<LikeButton postId="p1" initialLikeCount={3} initialLikedByMe={true} />);
  const btn = screen.getByRole("button", { name: "좋아요" });
  expect(btn).toHaveAttribute("aria-pressed", "true");
  expect(within(btn).getByText("3")).toBeInTheDocument();
});

it("낙관적 좋아요: 클릭 즉시(응답 전) 카운트 +1·pressed=true", async () => {
  const d = deferred<Response>();
  vi.spyOn(globalThis, "fetch").mockReturnValueOnce(d.promise);
  renderWithClient(<LikeButton postId="p1" initialLikeCount={2} initialLikedByMe={false} />);
  const btn = screen.getByRole("button", { name: "좋아요" });

  fireEvent.click(btn);

  expect(btn).toHaveAttribute("aria-pressed", "true");
  expect(within(btn).getByText("3")).toBeInTheDocument();

  // 정리: 응답 흘려보내 pending mutation 종료
  d.resolve(okResponse({ liked: true, likeCount: 3 }));
  await waitFor(() => expect(within(btn).getByText("3")).toBeInTheDocument());
});

it("성공 시 서버 likeCount로 보정한다(낙관 +1 이후 서버값 5)", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(okResponse({ liked: true, likeCount: 5 }));
  renderWithClient(<LikeButton postId="p1" initialLikeCount={2} initialLikedByMe={false} />);
  const btn = screen.getByRole("button", { name: "좋아요" });

  fireEvent.click(btn);

  await waitFor(() => expect(within(btn).getByText("5")).toBeInTheDocument());
  expect(btn).toHaveAttribute("aria-pressed", "true");
});

it("실패 시 이전 카운트·pressed 상태로 롤백한다", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify({ message: "fail" }), { status: 500 }),
  );
  renderWithClient(<LikeButton postId="p1" initialLikeCount={2} initialLikedByMe={false} />);
  const btn = screen.getByRole("button", { name: "좋아요" });

  fireEvent.click(btn);
  // 낙관적으로 먼저 +1
  expect(within(btn).getByText("3")).toBeInTheDocument();

  // 실패 후 롤백
  await waitFor(() => expect(within(btn).getByText("2")).toBeInTheDocument());
  expect(btn).toHaveAttribute("aria-pressed", "false");
});

it("취소: liked=true에서 클릭하면 카운트 -1·pressed=false", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(okResponse({ liked: false, likeCount: 2 }));
  renderWithClient(<LikeButton postId="p1" initialLikeCount={3} initialLikedByMe={true} />);
  const btn = screen.getByRole("button", { name: "좋아요" });

  fireEvent.click(btn);

  await waitFor(() => expect(within(btn).getByText("2")).toBeInTheDocument());
  expect(btn).toHaveAttribute("aria-pressed", "false");
});
```

- [ ] **Step 2: 테스트 실패 확인** — Run: `npm run test -- like-button`. Expected: FAIL (`./like-button` 모듈 없음 → import 에러).

- [ ] **Step 3: LikeButton 구현** — `components/board/like-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { MESSAGES } from "@/lib/messages";
import { useToggleLike } from "@/lib/query/mutations/like";

type Props = {
  postId: string;
  initialLikeCount: number;
  initialLikedByMe: boolean;
  variant?: "full" | "compact";
};

export function LikeButton({ postId, initialLikeCount, initialLikedByMe, variant = "full" }: Props) {
  const [liked, setLiked] = useState(initialLikedByMe);
  const [count, setCount] = useState(initialLikeCount);
  const { mutate } = useToggleLike();

  function toggle(e: React.MouseEvent) {
    // 목록 카드(Link) 내부에서도 쓰므로 이동/버블 차단.
    e.preventDefault();
    e.stopPropagation();

    const prevLiked = liked;
    const prevCount = count;
    const nextLiked = !prevLiked;

    // 낙관적 업데이트
    setLiked(nextLiked);
    setCount((c) => c + (nextLiked ? 1 : -1));

    mutate(
      { postId, like: nextLiked },
      {
        onSuccess: (data) => setCount(data.likeCount), // 서버 권위값으로 보정
        onError: () => { setLiked(prevLiked); setCount(prevCount); }, // 롤백
      },
    );
  }

  const size = variant === "compact" ? 16 : 20;
  const textSize = variant === "compact" ? "text-[12px]" : "text-[14px]";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={MESSAGES.board.like}
      aria-pressed={liked}
      className={`inline-flex items-center gap-1.5 ${textSize} font-semibold ${
        liked ? "text-danger" : "text-text-3"
      } hover:text-danger transition-colors`}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"}>
        <path
          d="M12 20s-7-4.35-9.5-8.5C1 8.5 2.5 5.5 5.5 5.5c1.8 0 3 1 2.5 2 .5-1 .7-2 2-2 3 0 4.5 3 3 6C19 15.65 12 20 12 20z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <span>{count}</span>
    </button>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인** — Run: `npm run test -- like-button`. Expected: 5개 테스트 PASS.

- [ ] **Step 5: Commit**

```bash
git add components/board/like-button.tsx components/board/like-button.test.tsx
git commit -m "feature: LikeButton 낙관적 좋아요 토글 컴포넌트 추가"
```

---

### Task 6: 상세·목록 통합

**Files:**
- Modify: `components/board/post-list-item.tsx`
- Modify: `app/(app)/board/[buildingId]/page.tsx`
- Modify: `app/(app)/board/[buildingId]/[postId]/page.tsx`

**Interfaces:**
- Consumes: `LikeButton`(`@/components/board/like-button`), Task 1의 `Post.likeCount`·`Post.likedByMe`.

- [ ] **Step 1: PostListItem에 좋아요 props + compact 버튼** — `components/board/post-list-item.tsx`:

```tsx
import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { LikeButton } from "@/components/board/like-button";
import { PAGE_ROUTES, POST_CATEGORY, POST_CATEGORY_LABEL, type PostCategory } from "@/lib/constants";

type Props = {
  id: string;
  category: PostCategory;
  title: string;
  createdAt?: string;
  buildingId: string;
  likeCount: number;
  likedByMe: boolean;
};

export function PostListItem({ id, category, title, createdAt, buildingId, likeCount, likedByMe }: Props) {
  const tone = category === POST_CATEGORY.NOTICE ? "warning" : "neutral";
  const label = POST_CATEGORY_LABEL[category];
  const dateStr = createdAt ? new Date(createdAt).toLocaleDateString("ko-KR") : "";

  return (
    <Link href={PAGE_ROUTES.boardPost(buildingId, id)} className="flex items-center gap-3 py-3.5 hover:bg-surface-2 px-4 -mx-4">
      <Chip tone={tone}>{label}</Chip>
      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-text">{title}</span>
      <LikeButton postId={id} initialLikeCount={likeCount} initialLikedByMe={likedByMe} variant="compact" />
      {dateStr && <span className="shrink-0 text-[12px] text-text-3">{dateStr}</span>}
    </Link>
  );
}
```

- [ ] **Step 2: 목록 페이지에서 값 전달** — `app/(app)/board/[buildingId]/page.tsx`의 `<PostListItem .../>`에 두 prop 추가:

```tsx
              <PostListItem
                key={p.id}
                id={p.id}
                category={p.category}
                title={p.title}
                createdAt={p.createdAt}
                buildingId={buildingId}
                likeCount={p.likeCount}
                likedByMe={p.likedByMe}
              />
```

- [ ] **Step 3: 상세 페이지에 full 버튼** — `app/(app)/board/[buildingId]/[postId]/page.tsx`에서 `LikeButton` import 추가하고, 본문 Card의 `</Card>` 직전(본문 `<p>` 아래)에 삽입:

```tsx
        <p className="whitespace-pre-wrap text-[15px] text-text leading-relaxed">{post.content}</p>
        <div className="mt-4">
          <LikeButton
            postId={postId}
            initialLikeCount={post.likeCount}
            initialLikedByMe={post.likedByMe}
            variant="full"
          />
        </div>
```

import 추가: `import { LikeButton } from "@/components/board/like-button";`

- [ ] **Step 4: 전체 검증** — Run 순서대로:
  - `npm run test` → PASS
  - `npm run typecheck` → PASS
  - `npm run lint` → PASS
  - `npm run build` → PASS

- [ ] **Step 5: Commit**

```bash
git add components/board/post-list-item.tsx "app/(app)/board/[buildingId]/page.tsx" "app/(app)/board/[buildingId]/[postId]/page.tsx"
git commit -m "feature: 게시글 상세·목록에 좋아요 버튼 통합"
```

---

## Self-Review

**Spec coverage:**
- §4.1 authDelete → Task 1 ✓
- §4.2 Post 타입·backendLike/Unlike → Task 1 ✓
- §4.3 API_ROUTES.postLikes·MESSAGES → Task 2 ✓
- §4.4 BFF route(POST·DELETE) → Task 3 ✓
- §4.5 useToggleLike → Task 4 ✓
- §4.6 LikeButton(로컬 state·낙관·보정·롤백·variant) → Task 5 ✓
- §4.7 상세·목록·post-list-item 통합(이벤트 전파 처리) → Task 6 ✓
- §5 테스트(초기·낙관·보정·롤백·취소) → Task 5 테스트 ✓

**범위 밖(YAGNI) 준수:** 좋아요 사용자 목록·실시간 동기화·알림 UI 미포함. (선택) e2e 시나리오는 이번 계획에서 제외 — 필요 시 후속.

**Type consistency:** `LikeResult`(board) = `{ postId, liked, likeCount }`; `ToggleLikeResult`(mutation) = `{ liked, likeCount }`(BFF 응답 그대로 소비). `LikeButton` props 이름은 Task 5·6에서 `initialLikeCount`/`initialLikedByMe`로 일치.
