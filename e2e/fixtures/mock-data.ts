import type {
  Me,
  Profile,
  Post,
  PostDetail,
  Comment,
  Notification,
  Building,
  Unit,
  backendSignup,
  backendPreviewInvite,
  backendRedeemInvite,
  backendIssueInvite,
} from "../../lib/api";
import { ROLE, POST_CATEGORY, NOTIFICATION_TYPE, LEASE_STATUS } from "../../lib/constants";
import {
  E2E_CREDENTIALS,
  E2E_BOARD,
  E2E_NOTIFICATION,
  E2E_SIGNUP,
  E2E_INVITE,
  E2E_BUILDING,
} from "./e2e-constants";

// 목 응답을 lib/api 백엔드 함수의 반환 타입에 묶는다(drift 게이트).
// backend* 함수는 type-only import이므로 런타임(server-only) 부작용 없이 계약만 참조한다.
type SignupResult = Awaited<ReturnType<typeof backendSignup>>;
type InvitePreview = Awaited<ReturnType<typeof backendPreviewInvite>>;
type RedeemResult = Awaited<ReturnType<typeof backendRedeemInvite>>;
type IssuedInvite = Awaited<ReturnType<typeof backendIssueInvite>>;

// 목 응답을 lib/api 도메인 타입에 묶는다 — 계약(타입) 변경 시 여기서 타입에러가 나
// CI typecheck가 실패하므로 E2E false-green(drift)을 방지한다.
export function mockMe(): Me {
  return { id: "u-e2e", email: E2E_CREDENTIALS.tenantEmail, role: ROLE.TENANT };
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
  };
}

export function mockPostDetail(): PostDetail {
  return { ...mockPost(), content: E2E_BOARD.postBody, comments: [] };
}

export function mockCreatedPost(): Post {
  return { id: "p-new-e2e", category: POST_CATEGORY.FREE, title: E2E_BOARD.postTitle, authorId: "u-e2e" };
}

export function mockCreatedComment(): Comment {
  return { id: "c-new-e2e", authorId: "u-e2e", content: "e2e-comment" };
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
export function mockUnreadCount(): { count: number } {
  return { count: mockNotifications().filter((n) => n.readAt === null).length };
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
