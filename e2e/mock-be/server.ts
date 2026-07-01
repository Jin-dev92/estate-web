import { createServer } from "node:http";

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
  if (url === "/health") return send(res, 200, { ok: true });

  // 로그인: fail@e2e.test 이면 401, 그 외엔 토큰 발급(무상태 분기).
  if (url === "/auth/login" && method === "POST") {
    const body = await readJson(req);
    if (body.email === "fail@e2e.test") {
      return send(res, 401, {
        statusCode: 401,
        code: "AUTH_INVALID_CREDENTIALS",
        message: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }
    return send(res, 201, { accessToken: "e2e-token" });
  }

  // 인증 사용자 정보(서명 검증 없음 — 목).
  if (url === "/auth/me" && method === "GET") {
    return send(res, 200, { id: "u-e2e", email: "tenant@e2e.test", role: "TENANT" });
  }

  // 대시보드 SSR이 부르는 읽기 — 안전 기본값.
  if (url === "/me/leases") return send(res, 200, []);
  if (url === "/buildings") return send(res, 200, []);
  if (url === "/notifications/unread-count") return send(res, 200, { count: 0 });
  if (url.startsWith("/notifications")) return send(res, 200, []);

  // 그 외는 404(목이 모르는 경로 — 테스트가 새 의존을 추가하면 여기 추가).
  send(res, 404, { message: `mock-be: unhandled ${method} ${url}` });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[mock-be] listening on http://localhost:${PORT}`);
});
