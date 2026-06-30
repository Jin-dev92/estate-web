/** httpOnly 세션 쿠키 이름 (서버 라우트·미들웨어 공유 단일 출처) */
export const SESSION_COOKIE = "session";

/** 자가 가입 가능 역할 (닫힌 집합 → as const + 파생 유니온) */
export const ROLE = { OWNER: "OWNER", TENANT: "TENANT" } as const;
export type SignupRole = (typeof ROLE)[keyof typeof ROLE];

/** 역할 표시 라벨(단일 출처) */
export const ROLE_LABEL: Record<string, string> = {
  OWNER: "건물주",
  TENANT: "입주자",
  ADMIN: "관리자",
};

/** 내부(Next) API 라우트 경로 */
export const API_ROUTES = {
  session: "/api/session",
  signup: "/api/session/signup",
  invitePreview: "/api/invite-preview",
  buildings: "/api/buildings",
  buildingUnits: (id: string) => `/api/buildings/${id}/units`,
  unitInviteCodes: (id: string) => `/api/units/${id}/invite-codes`,
  buildingPosts: (id: string) => `/api/buildings/${id}/posts`,
  postComments: (id: string) => `/api/posts/${id}/comments`,
  chatRooms: "/api/chat/rooms",
  notificationsRead: "/api/notifications/read",
  notificationRead: (id: string) => `/api/notifications/${id}/read`,
  profile: "/api/profile",
  profilePassword: "/api/profile/password",
  kakao: "/api/auth/kakao",
  kakaoComplete: "/api/auth/kakao/complete",
} as const;

/** 앱 페이지 경로(네비게이션 단일 출처) */
export const PAGE_ROUTES = {
  dashboard: "/dashboard",
  login: "/login",
  signup: "/signup",
  boardHome: "/board",
  board: (b: string) => `/board/${b}`,
  boardPost: (b: string, p: string) => `/board/${b}/${p}`,
  chat: "/chat",
  chatRoom: (id: string) => `/chat/${id}`,
  buildings: "/buildings",
  buildingDetail: (id: string) => `/buildings/${id}`,
  inviteCodes: "/invite-codes",
  notifications: "/notifications",
  settings: "/settings",
  kakaoCallback: "/auth/kakao/callback",
  roleSelect: "/signup/role-select",
} as const;

/** 게시글 카테고리 (백엔드 enum 동기화) */
export const POST_CATEGORY = { NOTICE: "NOTICE", FREE: "FREE" } as const;
export type PostCategory = (typeof POST_CATEGORY)[keyof typeof POST_CATEGORY];

/** 게시글 카테고리 표시 라벨 (단일 출처) */
export const POST_CATEGORY_LABEL: Record<PostCategory, string> = {
  [POST_CATEGORY.NOTICE]: "공지",
  [POST_CATEGORY.FREE]: "자유",
};

/** 임대 상태 */
export const LEASE_STATUS = { ACTIVE: "ACTIVE", ENDED: "ENDED" } as const;
export type LeaseStatus = (typeof LEASE_STATUS)[keyof typeof LEASE_STATUS];

/** 알림 종류 (백엔드 NotificationType 동기화) */
export const NOTIFICATION_TYPE = {
  MessageReceived: "MessageReceived",
  CommentAdded: "CommentAdded",
  PostAdded: "PostAdded",
} as const;
export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

/** 카카오 OAuth sessionStorage 키 (로그인↔콜백↔역할선택 공유) */
export const KAKAO_STATE_KEY = "kakao_state";
export const KAKAO_ONBOARDING_KEY = "kakao_onboarding";

/** /api/auth/kakao 응답의 다음 단계 식별자 (Route Handler↔콜백 공유) */
export const KAKAO_NEXT = { DASHBOARD: "dashboard", ROLE_SELECT: "role-select" } as const;
export type KakaoNext = (typeof KAKAO_NEXT)[keyof typeof KAKAO_NEXT];

/** 카카오 OAuth authorize URL. client id는 공개 가능(redirect용). */
export const KAKAO_CLIENT_ID = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID ?? "";
export function kakaoAuthorizeUrl(redirectUri: string, state: string): string {
  const q = new URLSearchParams({
    client_id: KAKAO_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "account_email",
    state,
  });
  return `https://kauth.kakao.com/oauth/authorize?${q.toString()}`;
}
