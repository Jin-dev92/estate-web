# 게시글 좋아요 — FE 설계

- 작성일: 2026-07-04
- 대상 레포: `estate-web` (Next.js 16 App Router + React 19 + TS + Tailwind v4 + Vitest)
- 백엔드 계약 출처: `estate-server` PR #80 (`docs/superpowers/specs/2026-07-03-post-like-design.md`)

## 1. 배경 / 목표

백엔드에 추가된 게시글 좋아요 기능(PR #80)을 FE에 연동한다. 게시글 **상세·목록**에서 좋아요 수(`likeCount`)와 내가 눌렀는지(`likedByMe`)를 표시하고, 하트 버튼으로 좋아요/취소를 **낙관적 업데이트**로 토글한다.

### 백엔드 계약 (이미 구현)
- `POST /posts/:postId/likes` → `201 { postId, liked: true, likeCount }`
- `DELETE /posts/:postId/likes` → `200 { postId, liked: false, likeCount }`
- `GET /posts/:postId`, `GET /buildings/:buildingId/posts` 응답에 `likeCount: number`·`likedByMe: boolean` 포함
- 인가: 인증 + 건물 멤버 (기존 게시판 라우트와 동일)

> ⚠️ **의존성**: PR #80이 아직 `estate-server` main에 미머지. FE는 계약 기준으로 구현하되, 로컬/실동작 검증은 좋아요 엔드포인트를 제공하는 백엔드가 떠 있어야 한다(BFF가 `BACKEND_URL`로 프록시).

## 2. 아키텍처 파악 (기존 패턴)

- **API 계층**: `lib/api/client.ts`(`authGet/authPost/authPatch` — `BACKEND_URL`에 Bearer로 호출) → `lib/api/board.ts`(도메인 함수) → **BFF 라우트**(`app/api/*`, 쿠키 세션→토큰 프록시) → 클라이언트가 `fetch(API_ROUTES.xxx)`.
- **게시판 페이지는 RSC(서버 컴포넌트)**: `board/[buildingId]/page.tsx`(목록)·`board/[buildingId]/[postId]/page.tsx`(상세)가 `backendListPosts`/`backendGetPost`로 서버에서 데이터를 가져와 렌더. 초기 좋아요 값은 **props로** 하위 클라이언트 컴포넌트에 전달.
- **인터랙션 선례**: `CommentForm`(plain `fetch(BFF)` + `router.refresh()`), `lib/query/mutations/chat.ts`(React Query `useMutation` + `fetch(BFF)`).
- **미러링 대상**: `app/api/posts/[id]/comments/route.ts`(BFF 라우트), `components/board/post-form.test.tsx`(vitest 컴포넌트 테스트).

## 3. 설계 결정

1. **낙관적 상태는 버튼 로컬 `useState`**: 페이지가 RSC라 데이터가 React Query 캐시가 아닌 props로 온다. 따라서 좋아요 상태(`liked`/`count`)는 `LikeButton`의 로컬 state로 두고 props로 시드한다. `useMutation`은 async 라이프사이클(호출·에러·pending)만 담당.
2. **토글마다 `router.refresh()` 하지 않음**: 연타 시 전체 RSC 리페치는 UX 저하. 낙관적 로컬 state를 유지하고, **서버가 돌려준 `likeCount`로 카운트만 보정**한다(권위값 동기화). 실패 시 이전 상태로 롤백.
3. **목록 아이템도 클릭 가능**: 상세뿐 아니라 목록 카드(`PostListItem`)에서도 좋아요 토글 가능(백엔드가 목록에도 값 제공).
4. **`authDelete` 헬퍼 신규**: `client.ts`에 DELETE 헬퍼가 없어 추가한다(GET/POST/PATCH만 존재).

## 4. 파일별 변경

### 4.1 `lib/api/client.ts`
- `authDelete<T>(path, token, errorMap?)` 추가 — `authPatch` 구조를 그대로 따르되 method `DELETE`. body 없음.

### 4.2 `lib/api/board.ts`
- `Post` 타입에 `likeCount: number`, `likedByMe: boolean` 추가.
- `PostDetail`은 `Post`를 확장하므로 자동 상속(추가 필드 정의 불필요) — 확인만.
- 백엔드 호출 함수 추가:
  - `backendLikePost(t, postId)` → `authPost<{ postId: string; liked: boolean; likeCount: number }>(\`/posts/${postId}/likes\`, t)`
  - `backendUnlikePost(t, postId)` → `authDelete<{ postId: string; liked: boolean; likeCount: number }>(\`/posts/${postId}/likes\`, t)`

### 4.3 `lib/constants.ts`
- `API_ROUTES`에 `postLikes: (id: string) => \`/api/posts/${id}/likes\`` 추가.
- `MESSAGES`에 좋아요 실패 카피(`board.likeFailed` 등) 추가.

### 4.4 `app/api/posts/[id]/likes/route.ts` (신규 BFF)
- `POST` 핸들러: `getToken` → 없으면 401 → `backendLikePost(token, id)` → JSON 반환. `comments/route.ts` 패턴 그대로.
- `DELETE` 핸들러: 동일 구조로 `backendUnlikePost`.
- 에러는 백엔드 상태/메시지를 전달(기존 라우트의 에러 처리 방식 따름).

### 4.5 `lib/query/mutations/like.ts` (신규)
- `useToggleLike()` — `useMutation`으로 감싼 함수. 입력 `{ postId, like: boolean }`:
  - `like === true` → `fetch(API_ROUTES.postLikes(postId), { method: 'POST' })`
  - `like === false` → `fetch(..., { method: 'DELETE' })`
  - 실패 시 서버 메시지(없으면 기본 카피)로 throw. 성공 시 `{ liked, likeCount }` 반환.
- `chat.ts`의 `useEnsureRoom` 구조를 미러링.

### 4.6 `components/board/like-button.tsx` (신규, `"use client"`)
- props: `{ postId: string; initialLikeCount: number; initialLikedByMe: boolean; variant?: 'full' | 'compact' }`
- 로컬 state: `liked`, `count`(props 시드).
- 클릭 핸들러:
  1. 현재 상태 스냅샷 저장 → 낙관적으로 `liked` 토글, `count ± 1`.
  2. `useToggleLike().mutate({ postId, like: nextLiked })`.
  3. `onSuccess`: 서버 `likeCount`로 `count` 보정(낙관값과 다를 수 있음).
  4. `onError`: 스냅샷으로 롤백.
- UI: 하트 아이콘(채움=liked / 외곽=미liked) + 카운트. 디자인 시스템 색상 토큰 사용(liked는 brand/danger 계열). `variant='compact'`는 목록용(작게).
- pending 중에도 낙관적이라 즉시 반응. 중복 클릭 방지(mutation pending이면 무시하거나 마지막 클릭 반영 — 단순화를 위해 pending 중 disable 대신 마지막 상태 우선).

### 4.7 통합
- **상세** `app/(app)/board/[buildingId]/[postId]/page.tsx`: 본문 Card 아래에 `<LikeButton postId={postId} initialLikeCount={post.likeCount} initialLikedByMe={post.likedByMe} variant="full" />`.
- **목록** `app/(app)/board/[buildingId]/page.tsx`: `PostListItem`에 `likeCount`·`likedByMe` props 전달.
- `components/board/post-list-item.tsx`: props 추가 후 카드 하단에 `<LikeButton ... variant="compact" />` 렌더. 좋아요 버튼 클릭이 카드 링크 이동과 겹치지 않게 이벤트 전파 처리(`e.stopPropagation`/`preventDefault`).

## 5. 테스트 (Vitest 필수)

`components/board/like-button.test.tsx` (`post-form.test.tsx` 패턴):
- 초기 렌더: `initialLikeCount`·`initialLikedByMe` 반영(하트 채움/카운트).
- 낙관적 좋아요: 클릭 즉시 카운트 +1·하트 채움(응답 전에).
- 성공 시 서버 `likeCount`로 보정(예: 낙관 +1 했지만 서버가 5를 주면 5로).
- 실패 시 롤백: mutation reject → 이전 카운트·하트 상태 복원.
- 취소(liked=true에서 클릭): 카운트 -1·하트 외곽.

BFF/네트워크는 mock(fetch 모킹). fetch·mutation은 기존 테스트가 쓰는 방식(MSW 또는 vi.fn fetch)을 따른다.

(선택) e2e `e2e/tests/board.spec.ts`에 좋아요 토글 시나리오 1개 추가.

## 6. 검증 기준

- `npm run test`(vitest) 통과 — like-button 테스트 포함.
- `npm run typecheck`·`npm run lint`·`npm run build` 통과.
- 상세·목록에서 좋아요 토글이 낙관적으로 즉시 반영되고, 실패 시 롤백.

## 7. 범위 밖 (YAGNI)

- 좋아요 누른 사용자 목록/아바타 표시.
- 실시간(WS) 좋아요 카운트 동기화 — 초기엔 새로고침/재진입 시 서버값 반영으로 충분.
- 좋아요 알림 UI는 기존 notification 시스템이 처리(FE-M5) — 이 작업 범위 아님.
