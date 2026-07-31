/** httpOnly 세션(액세스 토큰) 쿠키 이름 (서버 라우트·proxy 공유 단일 출처) */
export const SESSION_COOKIE = "session";

/** httpOnly 리프레시 토큰 쿠키 이름. 액세스 토큰 만료 시 갱신에만 쓴다. */
export const REFRESH_COOKIE = "refresh";

/**
 * 쿠키 수명(초). 백엔드 토큰 수명과 맞춘다 — 어긋나면
 * 쿠키는 있는데 토큰이 죽었거나(401), 토큰은 살았는데 쿠키가 없는(불필요한 갱신) 상태가 된다.
 * BE 기준: JWT_EXPIRES_IN=15m, 리프레시 14일.
 */
export const ACCESS_COOKIE_MAX_AGE = 60 * 15;
export const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 14;

/**
 * 세션 쿠키 옵션 빌더. `lib/session.ts`(Route Handler)와 `proxy.ts` 양쪽이 공유한다.
 *
 * 왜 여기 있는가: 갱신은 proxy에서 일어나고 로그인은 Route Handler에서 일어나는데,
 * 두 곳이 심는 쿠키의 옵션이 어긋나면 수명·전송 범위가 달라진다. `lib/session.ts`는
 * `next/headers`에 의존해 proxy에서 재사용할 수 없으므로, 순수한 옵션 부분만
 * 여기로 내려 단일 출처로 둔다. (이 파일에 함수를 두는 선례는 `kakaoAuthorizeUrl`.)
 */
export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true as const,
    // 실서비스(HTTPS)에선 secure. 단 E2E는 프로덕션 빌드를 http://localhost로 띄우는데
    // webkit은 localhost에서도 secure 쿠키를 저장하지 않아(chromium/firefox는 예외 허용)
    // 세션이 안 잡힌다. E2E_INSECURE_COOKIE=1일 때만 secure를 꺼 이 환경 아티팩트를 회피한다.
    secure: process.env.NODE_ENV === "production" && process.env.E2E_INSECURE_COOKIE !== "1",
    sameSite: "lax" as const,
    // path를 좁히지 않는다 — proxy가 모든 경로에서 리프레시 쿠키를 읽어야 갱신이 동작한다.
    path: "/",
    maxAge,
  };
}

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
  postLikes: (id: string) => `/api/posts/${id}/likes`,
  chatRooms: "/api/chat/rooms",
  notificationsRead: "/api/notifications/read",
  notificationRead: (id: string) => `/api/notifications/${id}/read`,
  profile: "/api/profile",
  profilePassword: "/api/profile/password",
  authPrefix: "/api/auth",
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
