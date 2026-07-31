import { createServer } from "node:http";
import {
  E2E_CREDENTIALS,
  E2E_OWNER_TOKEN,
  E2E_KAKAO,
  E2E_REFRESH,
} from "../fixtures/e2e-constants";
import {
  mockMe,
  mockOwnerMe,
  getProfileFor,
  setProfileName,
  listPosts,
  getPostDetail,
  addPost,
  addComment,
  getNotificationsFor,
  unreadCountFor,
  markNotificationRead,
  markAllNotificationsRead,
  mockSignup,
  mockInvitePreview,
  mockRedeem,
  mockBuilding,
  mockUnit,
  mockIssuedInvite,
  mockChatRoom,
  mockLease,
  mockTokenPair,
  mockRotatedTokenPair,
  mockKakaoOnboarding,
  mockKakaoTokenPair,
} from "../fixtures/mock-data";

const PORT = 3099;

// 요청 body를 JSON으로 읽는다(없으면 {}).
function readJson(req: import("node:http").IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function send(res: import("node:http").ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

// 세션 토큰(Authorization: Bearer <token>) — 토큰 스코프 상태의 버킷 키.
function bearer(req: import("node:http").IncomingMessage): string {
  return (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
}

const server = createServer(async (req, res) => {
  const url = (req.url ?? "").split("?")[0];
  const method = req.method ?? "GET";

  // readiness 체크
  if (url === "/health" && method === "GET") return send(res, 200, { ok: true });

  // 로그인: failEmail 이면 401, 그 외엔 토큰 발급(무상태 분기).
  //
  // drift 게이트 범위 주의: 성공 응답은 타입드 빌더(mock*)로 lib/api 도메인 타입에 묶여
  // 있지만 **에러 응답은 인라인이라 무보호**다(대응 타입이 FE에 없다). FE는 status만
  // 보고 errorMap으로 분기하므로, BE가 status를 바꾸면(401→403 등) 여기도 E2E도
  // 조용히 통과한다. 편입은 README 후속 백로그 "에러 계약 편입" 항목.
  if (url === "/auth/login" && method === "POST") {
    const body = await readJson(req);
    if (body.email === E2E_CREDENTIALS.failEmail) {
      // message는 FE에서 사용하지 않는다 — errorMap → MESSAGES.auth.invalidCredentials 로 덮어쓴다.
      return send(res, 401, {
        statusCode: 401,
        code: "AUTH_INVALID_CREDENTIALS",
        message: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }
    return send(res, 201, mockTokenPair());
  }

  // 갱신(POST /auth/refresh) — 공개. deadToken이면 401, 그 외엔 회전된 새 쌍 발급.
  // 실제 BE는 무효·재사용·만료를 모두 401 하나로 묶는다(공격자에게 내부 상태를 안 알림).
  if (url === "/auth/refresh" && method === "POST") {
    const body = await readJson(req);
    if (body.refreshToken === E2E_REFRESH.deadToken) {
      return send(res, 401, {
        statusCode: 401,
        code: "AUTH_INVALID_REFRESH_TOKEN",
        message: "리프레시 토큰이 유효하지 않습니다.",
      });
    }
    return send(res, 201, mockRotatedTokenPair());
  }

  // 로그아웃(POST /auth/logout) — 공개·멱등. 무상태라 성공만 표현한다.
  if (url === "/auth/logout" && method === "POST") {
    return send(res, 201, { ok: true });
  }

  // 회원가입(무상태) — 생성 성공만 표현. Next 라우트가 이어서 /auth/login으로 토큰을 받는다.
  if (url === "/auth/signup" && method === "POST") {
    const body = await readJson(req);
    return send(res, 201, mockSignup(String(body.role ?? "")));
  }

  // 카카오 로그인(POST /auth/kakao) — code sentinel로 분기(무상태).
  // existingCode: 기존 연동 계정(accessToken 즉시 발급) / newCode: 신규 사용자(onboardingToken만 발급)
  // / errorCode: 이메일 동의 누락 등 BE 400 에러 재현.
  if (url === "/auth/kakao" && method === "POST") {
    const body = await readJson(req);
    if (body.code === E2E_KAKAO.errorCode) {
      return send(res, 400, {
        statusCode: 400,
        code: "AUTH_KAKAO_EMAIL_REQUIRED",
        message: "카카오 이메일 동의가 필요합니다.",
      });
    }
    if (body.code === E2E_KAKAO.newCode) {
      // 신규 유저는 토큰 쌍 없이 온보딩 토큰만 — 이 분기의 정의다.
      return send(res, 201, mockKakaoOnboarding());
    }
    return send(res, 201, mockKakaoTokenPair());
  }

  // 카카오 온보딩 완료(POST /auth/kakao/complete) — onboardingToken이 유효할 때만 accessToken 발급.
  if (url === "/auth/kakao/complete" && method === "POST") {
    const body = await readJson(req);
    if (body.onboardingToken !== E2E_KAKAO.onboardingToken) {
      return send(res, 400, {
        statusCode: 400,
        code: "AUTH_KAKAO_ONBOARDING_INVALID",
        message: "잘못된 온보딩 토큰입니다.",
      });
    }
    return send(res, 201, mockTokenPair());
  }

  // 인증 사용자 정보(서명 검증 없음 — 목).
  if (url === "/auth/me" && method === "GET") {
    // 세션 토큰으로 역할 분기 — owner 토큰이면 OWNER, 그 외 TENANT(기본).
    const owner = (req.headers.authorization ?? "").includes(E2E_OWNER_TOKEN);
    return send(res, 200, owner ? mockOwnerMe() : mockMe());
  }

  // 대시보드 SSR이 부르는 읽기(GET) — 안전 기본값.
  // 메서드 가드로 읽기 경로가 다른 메서드까지 200을 반환하는 drift를 막는다.
  if (method === "GET") {
    if (url === "/me/leases") return send(res, 200, [mockLease()]);
    if (url === "/buildings") return send(res, 200, [mockBuilding()]);
    // 방 목록: OWNER는 방 1건(목록 렌더), TENANT는 빈 목록(StartChatButton→start-chat).
    if (url === "/chat/rooms") {
      const owner = (req.headers.authorization ?? "").includes(E2E_OWNER_TOKEN);
      return send(res, 200, owner ? [mockChatRoom()] : []);
    }
    // 방 히스토리(GET /chat/rooms/:id/messages) — 실시간 에코만 테스트하므로 빈 히스토리.
    if (/^\/chat\/rooms\/[^/]+\/messages$/.test(url)) return send(res, 200, []);
    // 알림·미읽음 개수 — 토큰 스코프(읽음 처리가 반영된다).
    if (url === "/notifications/unread-count") return send(res, 200, unreadCountFor(bearer(req)));
    if (url === "/notifications") return send(res, 200, getNotificationsFor(bearer(req)));
    // 설정 SSR(backendProfile)이 부르는 프로필 조회 — 토큰 스코프(이름 수정이 반영된다).
    if (url === "/auth/profile") return send(res, 200, getProfileFor(bearer(req)));
    // 게시판 목록(GET /buildings/:id/posts) — 상태있는 목: 작성 글이 반영된다.
    if (url.startsWith("/buildings/") && url.endsWith("/posts"))
      return send(res, 200, listPosts());
    // 호실 목록(GET /buildings/:id/units, OWNER 건물 상세).
    if (url.startsWith("/buildings/") && url.endsWith("/units"))
      return send(res, 200, [mockUnit()]);
    // 게시글 상세(GET /posts/:id) — 상태있는 목: 작성 댓글이 반영된다.
    const postMatch = url.match(/^\/posts\/([^/]+)$/);
    if (postMatch) return send(res, 200, getPostDetail(postMatch[1]));
    // 초대코드 미리보기(GET /invite-codes/:code/preview) — 공개(미인증).
    const preview = url.match(/^\/invite-codes\/([^/]+)\/preview$/);
    if (preview) return send(res, 200, mockInvitePreview(decodeURIComponent(preview[1])));
  }

  // 알림 읽음 처리(PATCH) — 토큰 스코프 상태에 반영. 전체읽음 /notifications/read,
  // 개별읽음 /notifications/:id/read. 실 BE 계약({ok:true})과 일치.
  if (method === "PATCH" && url.startsWith("/notifications") && url.endsWith("/read")) {
    const oneMatch = url.match(/^\/notifications\/([^/]+)\/read$/);
    if (oneMatch) markNotificationRead(bearer(req), oneMatch[1]);
    else if (url === "/notifications/read") markAllNotificationsRead(bearer(req));
    return send(res, 200, { ok: true });
  }

  // 프로필 이름 수정(PATCH) — 토큰 스코프 상태에 저장, 재조회 시 반영된다.
  if (method === "PATCH" && url === "/auth/profile") {
    const body = await readJson(req);
    return send(res, 200, setProfileName(bearer(req), String(body.name ?? "")));
  }

  // 비밀번호 변경(PATCH /auth/password) — 현재 비밀번호가 센티넬이면 401(불일치), 그 외 성공.
  // message는 FE errorMap이 MESSAGES.settings.wrongCurrentPassword로 덮어쓴다.
  if (method === "PATCH" && url === "/auth/password") {
    const body = await readJson(req);
    if (body.currentPassword === E2E_CREDENTIALS.wrongPassword) {
      return send(res, 401, { statusCode: 401, code: "AUTH_INVALID_CREDENTIALS", message: "현재 비밀번호가 일치하지 않습니다." });
    }
    return send(res, 200, { ok: true });
  }

  // 게시글 작성(POST /buildings/:id/posts) — 저장 후 목록 GET에 반영된다.
  if (method === "POST" && url.startsWith("/buildings/") && url.endsWith("/posts")) {
    const body = await readJson(req);
    return send(res, 201, addPost(String(body.title ?? ""), String(body.content ?? "")));
  }

  // 댓글 작성(POST /posts/:id/comments) — 저장 후 상세 GET에 반영된다.
  const commentMatch = url.match(/^\/posts\/([^/]+)\/comments$/);
  if (method === "POST" && commentMatch) {
    const body = await readJson(req);
    return send(res, 201, addComment(commentMatch[1], String(body.content ?? "")));
  }

  // 초대 수락/입주(POST /invite-codes/redeem) — 가입 후 자동 로그인 토큰으로 호출된다.
  if (method === "POST" && url === "/invite-codes/redeem") {
    return send(res, 201, mockRedeem());
  }

  // 초대코드 발급(POST /units/:unitId/invite-codes, OWNER).
  if (method === "POST" && url.startsWith("/units/") && url.endsWith("/invite-codes")) {
    return send(res, 201, mockIssuedInvite());
  }

  // 채팅방 생성/조회(POST /chat/rooms, start-chat) — 방을 반환해 클라가 방으로 이동한다.
  if (method === "POST" && url === "/chat/rooms") {
    return send(res, 201, mockChatRoom());
  }

  // 그 외는 404(목이 모르는 경로 — 테스트가 새 의존을 추가하면 여기 추가).
  send(res, 404, { message: `mock-be: unhandled ${method} ${url}` });
});

server.listen(PORT, () => {
  console.log(`[mock-be] listening on http://localhost:${PORT}`);
});
