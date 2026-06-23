/** httpOnly 세션 쿠키 이름 (서버 라우트·미들웨어 공유 단일 출처) */
export const SESSION_COOKIE = "session";

/** 자가 가입 가능 역할 (닫힌 집합 → as const + 파생 유니온) */
export const ROLE = { OWNER: "OWNER", TENANT: "TENANT" } as const;
export type SignupRole = (typeof ROLE)[keyof typeof ROLE];

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
