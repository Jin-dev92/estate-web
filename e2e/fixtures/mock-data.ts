import type {
  Me,
  Profile,
  Post,
  PostDetail,
  Comment,
  Notification,
  Building,
  Unit,
  ChatRoom,
  Lease,
  TokenPair,
  KakaoLoginResult,
  backendSignup,
  backendPreviewInvite,
  backendRedeemInvite,
  backendIssueInvite,
  backendUnreadCount,
} from "../../lib/api";
import { ROLE, POST_CATEGORY, NOTIFICATION_TYPE, LEASE_STATUS } from "../../lib/constants";
import {
  E2E_CREDENTIALS,
  E2E_BOARD,
  E2E_NOTIFICATION,
  E2E_SIGNUP,
  E2E_INVITE,
  E2E_BUILDING,
  E2E_CHAT,
  E2E_KAKAO,
  E2E_REFRESH,
  E2E_SESSION_TOKEN,
} from "./e2e-constants";

// 목 응답을 lib/api 백엔드 함수의 반환 타입에 묶는다(drift 게이트).
// backend* 함수는 type-only import이므로 런타임(server-only) 부작용 없이 계약만 참조한다.
type SignupResult = Awaited<ReturnType<typeof backendSignup>>;
type InvitePreview = Awaited<ReturnType<typeof backendPreviewInvite>>;
type RedeemResult = Awaited<ReturnType<typeof backendRedeemInvite>>;
type IssuedInvite = Awaited<ReturnType<typeof backendIssueInvite>>;
// 미읽음 개수는 lib/api에 이름 붙은 타입이 없다(`authGet<{count:number}>` 인라인).
// 구조를 손으로 베끼면 이중 정의가 되므로 함수 반환 타입에서 역산한다.
type UnreadCount = Awaited<ReturnType<typeof backendUnreadCount>>;

// 목 응답을 lib/api 도메인 타입에 묶는다 — 계약(타입) 변경 시 여기서 타입에러가 나
// CI typecheck가 실패하므로 E2E false-green(drift)을 방지한다.
export function mockMe(): Me {
  return { id: "u-e2e", email: E2E_CREDENTIALS.tenantEmail, role: ROLE.TENANT };
}

// OWNER 세션(대시보드 OWNER 홈 렌더 검증) — /auth/me가 owner 토큰일 때 반환.
export function mockOwnerMe(): Me {
  return { id: "u-owner-e2e", email: E2E_SIGNUP.ownerEmail, role: ROLE.OWNER };
}

// 입주자 활성 리스(GET /me/leases) — start-chat가 활성 건물을 잡도록 buildingId 포함.
export function mockLease(): Lease {
  return {
    id: "lease-e2e",
    unitId: E2E_BUILDING.unitId,
    status: LEASE_STATUS.ACTIVE,
    unitName: E2E_BUILDING.unitName,
    buildingName: E2E_BUILDING.name,
    buildingId: E2E_BUILDING.id,
  };
}

// 채팅 방 목록(GET /chat/rooms) — buildingId를 E2E_BUILDING에 맞춰 OWNER 목록 라벨이
// "터전오너빌딩 · 입주자"로 렌더되게 한다(건물명은 /buildings 목에서 매핑).
export function mockChatRoom(): ChatRoom {
  return {
    id: E2E_CHAT.roomId,
    buildingId: E2E_BUILDING.id,
    ownerId: "u-owner-e2e",
    tenantId: "u-e2e",
    lastMessage: { content: "안녕하세요", createdAt: "2026-07-01T00:00:00.000Z" },
  };
}

export function mockProfile(): Profile {
  return {
    id: "u-e2e",
    email: E2E_CREDENTIALS.tenantEmail,
    name: E2E_CREDENTIALS.tenantName,
    role: ROLE.TENANT,
  };
}

export function mockPost(): Post {
  return {
    id: E2E_BOARD.postId,
    category: POST_CATEGORY.FREE,
    title: E2E_BOARD.postTitle,
    authorId: "u-e2e",
    createdAt: "2026-07-01T00:00:00.000Z",
    likeCount: 0,
    likedByMe: false,
  };
}

// ── 상태있는 게시판(B1) ─────────────────────────────────────────────────
// 작성 글/댓글이 목록·상세에 반영되는지 영속성 단언용. 병렬(3브라우저) 공유 안전:
// append + "내 것이 보인다"(존재) 단언만 지원하고 개수·부재는 단언하지 않는다.
// 목 BE 단일 프로세스의 모듈 상태로 테스트 런 동안 유지된다.
const boardPosts: Post[] = [mockPost()];
const boardDetails = new Map<string, { content: string; comments: Comment[] }>([
  [E2E_BOARD.postId, { content: E2E_BOARD.postBody, comments: [] }],
]);

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function listPosts(): Post[] {
  return boardPosts;
}

export function addPost(title: string, content: string): Post {
  const post: Post = {
    id: uid("p"),
    category: POST_CATEGORY.FREE,
    title,
    authorId: "u-e2e",
    createdAt: new Date().toISOString(),
    likeCount: 0,
    likedByMe: false,
  };
  boardPosts.unshift(post);
  boardDetails.set(post.id, { content, comments: [] });
  return post;
}

export function getPostDetail(id: string): PostDetail {
  const base = boardPosts.find((p) => p.id === id) ?? mockPost();
  const d = boardDetails.get(id) ?? { content: E2E_BOARD.postBody, comments: [] };
  return { ...base, id, content: d.content, comments: d.comments };
}

export function addComment(postId: string, content: string): Comment {
  const comment: Comment = { id: uid("c"), authorId: "u-e2e", content };
  const d = boardDetails.get(postId) ?? { content: E2E_BOARD.postBody, comments: [] };
  d.comments.push(comment);
  boardDetails.set(postId, d);
  return comment;
}

// 알림 센터 목록 — 미읽음(PostAdded) + 읽음(CommentAdded) 두 건.
// 미읽음은 게시판 결합키를 물려 클릭 시 딥링크가 /board/:b/:p 로 향한다.
export function mockNotifications(): Notification[] {
  return [
    {
      id: E2E_NOTIFICATION.unreadId,
      type: NOTIFICATION_TYPE.PostAdded,
      title: E2E_NOTIFICATION.unreadTitle,
      body: E2E_NOTIFICATION.unreadBody,
      entityType: "post",
      entityId: E2E_BOARD.postId,
      buildingId: E2E_BOARD.buildingId,
      readAt: null,
      createdAt: "2026-07-01T00:00:00.000Z",
    },
    {
      id: E2E_NOTIFICATION.readId,
      type: NOTIFICATION_TYPE.CommentAdded,
      title: E2E_NOTIFICATION.readTitle,
      body: E2E_NOTIFICATION.readBody,
      entityType: "comment",
      entityId: E2E_BOARD.postId,
      buildingId: E2E_BOARD.buildingId,
      readAt: "2026-07-01T00:00:00.000Z",
      createdAt: "2026-07-01T00:00:00.000Z",
    },
  ];
}

// 미읽음 개수 — mockNotifications()의 readAt=null 건수와 일치시킨다.
export function mockUnreadCount(): UnreadCount {
  return { count: mockNotifications().filter((n) => n.readAt === null).length };
}

// ── 토큰 스코프 상태(후속 A) ─────────────────────────────────────────────
// 프로필 이름·알림 읽음을 테스트별(=유니크 토큰별) 버킷으로 격리해 병렬/3브라우저에서
// 서로 오염되지 않게 한다. 각 토큰은 최초 접근 시 시드(mockProfile/mockNotifications) 기준.
const profileNameByToken = new Map<string, string>();
const readNotifIdsByToken = new Map<string, Set<string>>();

export function getProfileFor(token: string): Profile {
  return { ...mockProfile(), name: profileNameByToken.get(token) ?? E2E_CREDENTIALS.tenantName };
}

export function setProfileName(token: string, name: string): Profile {
  profileNameByToken.set(token, name);
  return getProfileFor(token);
}

export function getNotificationsFor(token: string): Notification[] {
  const readIds = readNotifIdsByToken.get(token);
  if (!readIds || readIds.size === 0) return mockNotifications();
  const now = new Date().toISOString();
  return mockNotifications().map((n) => (readIds.has(n.id) ? { ...n, readAt: n.readAt ?? now } : n));
}

export function unreadCountFor(token: string): UnreadCount {
  return { count: getNotificationsFor(token).filter((n) => n.readAt === null).length };
}

export function markNotificationRead(token: string, id: string): void {
  const set = readNotifIdsByToken.get(token) ?? new Set<string>();
  set.add(id);
  readNotifIdsByToken.set(token, set);
}

export function markAllNotificationsRead(token: string): void {
  const set = readNotifIdsByToken.get(token) ?? new Set<string>();
  for (const n of mockNotifications()) set.add(n.id);
  readNotifIdsByToken.set(token, set);
}

// 회원가입(POST /auth/signup) — 무상태라 생성 성공만 표현. role은 요청값을 되돌린다.
export function mockSignup(role: SignupResult["role"]): SignupResult {
  return { id: "u-new-e2e", email: E2E_SIGNUP.tenantEmail, role };
}

// 초대코드 미리보기(GET /invite-codes/:code/preview) — validCode만 valid=true.
export function mockInvitePreview(code: string): InvitePreview {
  if (code !== E2E_INVITE.validCode) return { valid: false };
  return { valid: true, buildingName: E2E_INVITE.buildingName, unitName: E2E_INVITE.unitName };
}

// 초대 수락/입주(POST /invite-codes/redeem) — 활성 리스 생성 성공만 표현.
export function mockRedeem(): RedeemResult {
  return { id: "lease-e2e", unitId: "unit-e2e", status: LEASE_STATUS.ACTIVE };
}

// 내 건물 목록(GET /buildings, OWNER).
export function mockBuilding(): Building {
  return { id: E2E_BUILDING.id, name: E2E_BUILDING.name, address: E2E_BUILDING.address };
}

// 건물 호실 목록(GET /buildings/:id/units).
export function mockUnit(): Unit {
  return {
    id: E2E_BUILDING.unitId,
    buildingId: E2E_BUILDING.id,
    name: E2E_BUILDING.unitName,
    floor: E2E_BUILDING.floor,
  };
}

// 초대코드 발급(POST /units/:unitId/invite-codes) — 무상태라 고정 코드/만료를 표현.
export function mockIssuedInvite(): IssuedInvite {
  return { code: E2E_BUILDING.issuedCode, expiresInSec: E2E_BUILDING.expiresInSec };
}

// ── 인증(auth) 응답 ───────────────────────────────────────────────────────────
// 로그인·갱신·카카오는 원래 목 서버가 인라인 객체로 답하던 경로였다. send()의 body가
// unknown이라 타입 검사가 걸리지 않아, BE가 토큰 응답 형태를 바꿔도 아무도 잡지 못했다.
// 도메인 타입(TokenPair·KakaoLoginResult)에 묶어 drift 게이트 안으로 넣는다.

// 로그인·카카오 성공 시 발급하는 토큰 쌍(POST /auth/login·/auth/kakao·/auth/kakao/complete).
export function mockTokenPair(): TokenPair {
  return { accessToken: E2E_SESSION_TOKEN, refreshToken: E2E_REFRESH.validToken };
}

// 갱신이 회전시킨 새 토큰 쌍(POST /auth/refresh).
// 로그인 발급분과 값이 달라야 "교체 저장됐는지"를 E2E가 단언할 수 있다.
export function mockRotatedTokenPair(): TokenPair {
  return {
    accessToken: E2E_REFRESH.rotatedAccessToken,
    refreshToken: E2E_REFRESH.rotatedRefreshToken,
  };
}

// 카카오 신규 유저 — 토큰 쌍 없이 온보딩 토큰만 오는 분기(POST /auth/kakao).
// KakaoLoginResult가 유니온이라 이 형태도 계약의 일부다.
export function mockKakaoOnboarding(): KakaoLoginResult {
  return { onboardingToken: E2E_KAKAO.onboardingToken };
}

// 카카오 기존 유저 — 토큰 쌍이 오는 분기(POST /auth/kakao).
// 반환 타입을 KakaoLoginResult로 두어 "이 경로의 계약은 유니온"임을 타입으로 남긴다.
export function mockKakaoTokenPair(): KakaoLoginResult {
  return mockTokenPair();
}
