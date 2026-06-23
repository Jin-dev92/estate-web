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
} as const;

/** 앱 페이지 경로(네비게이션 단일 출처) */
export const PAGE_ROUTES = {
  dashboard: "/dashboard",
  login: "/login",
  signup: "/signup",
  board: "/board",
  chat: "/chat",
  buildings: "/buildings",
  buildingDetail: (id: string) => `/buildings/${id}`,
  inviteCodes: "/invite-codes",
  notifications: "/notifications",
} as const;

/** 임대 상태 */
export const LEASE_STATUS = { ACTIVE: "ACTIVE", ENDED: "ENDED" } as const;
export type LeaseStatus = (typeof LEASE_STATUS)[keyof typeof LEASE_STATUS];
