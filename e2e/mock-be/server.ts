import { createServer } from "node:http";
import { E2E_CREDENTIALS, E2E_SESSION_TOKEN } from "../fixtures/e2e-constants";
import {
  mockMe,
  mockProfile,
  mockPost,
  mockPostDetail,
  mockCreatedPost,
  mockCreatedComment,
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

  // 인증 사용자 정보(서명 검증 없음 — 목).
  if (url === "/auth/me" && method === "GET") {
    return send(res, 200, mockMe());
  }

  // 대시보드 SSR이 부르는 읽기(GET) — 안전 기본값.
  // 메서드 가드로 읽기 경로가 다른 메서드까지 200을 반환하는 drift를 막는다.
  if (method === "GET") {
    if (url === "/me/leases") return send(res, 200, []);
    if (url === "/buildings") return send(res, 200, []);
    if (url === "/chat/rooms") return send(res, 200, []);
    if (url === "/notifications/unread-count") return send(res, 200, { count: 0 });
    if (url === "/notifications") return send(res, 200, []);
    // 설정 SSR(backendProfile)이 부르는 프로필 조회.
    if (url === "/auth/profile") return send(res, 200, mockProfile());
    // 게시판 목록(GET /buildings/:id/posts).
    if (url.startsWith("/buildings/") && url.endsWith("/posts"))
      return send(res, 200, [mockPost()]);
    // 게시글 상세(GET /posts/:id) — 댓글 없음.
    if (/^\/posts\/[^/]+$/.test(url)) return send(res, 200, mockPostDetail());
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

  // 게시글 작성(POST /buildings/:id/posts).
  if (method === "POST" && url.startsWith("/buildings/") && url.endsWith("/posts")) {
    return send(res, 201, mockCreatedPost());
  }

  // 댓글 작성(POST /posts/:id/comments).
  if (method === "POST" && url.startsWith("/posts/") && url.endsWith("/comments")) {
    return send(res, 201, mockCreatedComment());
  }

  // 그 외는 404(목이 모르는 경로 — 테스트가 새 의존을 추가하면 여기 추가).
  send(res, 404, { message: `mock-be: unhandled ${method} ${url}` });
});

server.listen(PORT, () => {
  console.log(`[mock-be] listening on http://localhost:${PORT}`);
});
