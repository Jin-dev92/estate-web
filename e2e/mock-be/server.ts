import { createServer } from "node:http";
import { E2E_CREDENTIALS, E2E_SESSION_TOKEN, E2E_OWNER_TOKEN } from "../fixtures/e2e-constants";
import {
  mockMe,
  mockOwnerMe,
  mockProfile,
  mockPost,
  mockPostDetail,
  mockCreatedPost,
  mockCreatedComment,
  mockNotifications,
  mockUnreadCount,
  mockSignup,
  mockInvitePreview,
  mockRedeem,
  mockBuilding,
  mockUnit,
  mockIssuedInvite,
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

const server = createServer(async (req, res) => {
  const url = (req.url ?? "").split("?")[0];
  const method = req.method ?? "GET";

  // readiness 체크
  if (url === "/health" && method === "GET") return send(res, 200, { ok: true });

  // 로그인: failEmail 이면 401, 그 외엔 토큰 발급(무상태 분기).
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
    return send(res, 201, { accessToken: E2E_SESSION_TOKEN });
  }

  // 회원가입(무상태) — 생성 성공만 표현. Next 라우트가 이어서 /auth/login으로 토큰을 받는다.
  if (url === "/auth/signup" && method === "POST") {
    const body = await readJson(req);
    return send(res, 201, mockSignup(String(body.role ?? "")));
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
    if (url === "/me/leases") return send(res, 200, []);
    if (url === "/buildings") return send(res, 200, [mockBuilding()]);
    if (url === "/chat/rooms") return send(res, 200, []);
    // 방 히스토리(GET /chat/rooms/:id/messages) — 실시간 에코만 테스트하므로 빈 히스토리.
    if (/^\/chat\/rooms\/[^/]+\/messages$/.test(url)) return send(res, 200, []);
    if (url === "/notifications/unread-count") return send(res, 200, mockUnreadCount());
    if (url === "/notifications") return send(res, 200, mockNotifications());
    // 설정 SSR(backendProfile)이 부르는 프로필 조회.
    if (url === "/auth/profile") return send(res, 200, mockProfile());
    // 게시판 목록(GET /buildings/:id/posts).
    if (url.startsWith("/buildings/") && url.endsWith("/posts"))
      return send(res, 200, [mockPost()]);
    // 호실 목록(GET /buildings/:id/units, OWNER 건물 상세).
    if (url.startsWith("/buildings/") && url.endsWith("/units"))
      return send(res, 200, [mockUnit()]);
    // 게시글 상세(GET /posts/:id) — 댓글 없음.
    if (/^\/posts\/[^/]+$/.test(url)) return send(res, 200, mockPostDetail());
    // 초대코드 미리보기(GET /invite-codes/:code/preview) — 공개(미인증).
    const preview = url.match(/^\/invite-codes\/([^/]+)\/preview$/);
    if (preview) return send(res, 200, mockInvitePreview(decodeURIComponent(preview[1])));
  }

  // 알림 읽음 처리(PATCH) — 전체읽음 /notifications/read, 개별읽음 /notifications/:id/read.
  // 실 BE 계약({ok:true})과 일치시켜, 이전 catch-all이 PATCH에도 []를 답하던 문제를 제거.
  if (method === "PATCH" && url.startsWith("/notifications") && url.endsWith("/read")) {
    return send(res, 200, { ok: true });
  }

  // 프로필 이름 수정(PATCH) — 무상태라 성공(200)만 표현하고 응답 name은 고정값.
  if (method === "PATCH" && url === "/auth/profile") {
    return send(res, 200, mockProfile());
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

  // 게시글 작성(POST /buildings/:id/posts).
  if (method === "POST" && url.startsWith("/buildings/") && url.endsWith("/posts")) {
    return send(res, 201, mockCreatedPost());
  }

  // 댓글 작성(POST /posts/:id/comments).
  if (method === "POST" && url.startsWith("/posts/") && url.endsWith("/comments")) {
    return send(res, 201, mockCreatedComment());
  }

  // 초대 수락/입주(POST /invite-codes/redeem) — 가입 후 자동 로그인 토큰으로 호출된다.
  if (method === "POST" && url === "/invite-codes/redeem") {
    return send(res, 201, mockRedeem());
  }

  // 초대코드 발급(POST /units/:unitId/invite-codes, OWNER).
  if (method === "POST" && url.startsWith("/units/") && url.endsWith("/invite-codes")) {
    return send(res, 201, mockIssuedInvite());
  }

  // 그 외는 404(목이 모르는 경로 — 테스트가 새 의존을 추가하면 여기 추가).
  send(res, 404, { message: `mock-be: unhandled ${method} ${url}` });
});

server.listen(PORT, () => {
  console.log(`[mock-be] listening on http://localhost:${PORT}`);
});
