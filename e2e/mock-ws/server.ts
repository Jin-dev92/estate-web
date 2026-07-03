import { createServer } from "node:http";
import { Server } from "socket.io";
import type { ChatMessage } from "../../lib/api";
import { E2E_CHAT } from "../fixtures/e2e-constants";

// E2E 전용 socket.io 목 서버. 실 BE의 채팅 게이트웨이를 대신해 결정론적으로 동작한다.
// 스코프(스펙 옵션 B): 한 방에서 connect → message emit → 같은 소켓으로 에코. auth 미검증.
const PORT = 3098;

// webServer readiness 체크용 http 서버에 socket.io를 attach한다.
const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, { cors: { origin: "*" } });

// 핸드셰이크 단계 인증 게이트. 이 시점엔 아직 roomId를 모르므로(연결 후 join으로 옴)
// token만으로 판단한다. next(new Error(...))를 호출하면 클라이언트에 connect_error가 발생하고
// connect/join은 전혀 일어나지 않는다.
io.use((socket, next) => {
  const token = String(socket.handshake.auth?.token ?? "");
  if (token.startsWith(E2E_CHAT.wsConnectErrorTokenBase)) {
    next(new Error("connect_error"));
    return;
  }
  next();
});

// reconnectRoomId 전용 — 토큰별로 "이미 한 번 끊었는지" 기억해 무한 재연결 루프를 막는다.
const disconnectOnceTokens = new Set<string>();

io.on("connection", (socket) => {
  socket.on("join", (payload: { roomId: string }) => {
    if (payload?.roomId === E2E_CHAT.forbiddenRoomId) {
      socket.emit("error", { code: "CHAT_NOT_ROOM_PARTICIPANT" });
      return;
    }
    if (payload?.roomId === E2E_CHAT.reconnectRoomId) {
      const token = String(socket.handshake.auth?.token ?? "");
      if (!disconnectOnceTokens.has(token)) {
        disconnectOnceTokens.add(token);
        // socket.disconnect()는 "io server disconnect" 사유를 발생시켜 socket.io-client가
        // 의도적 종료로 간주하고 자동 재연결을 하지 않는다. 네트워크 순단을 흉내내
        // 기본 자동 재연결을 트리거하려면 transport 레벨에서 끊어야 한다("transport close").
        socket.conn.close();
        return;
      }
    }
  });
  socket.on("message", (payload: { roomId: string; content: string }) => {
    // 에코를 ChatMessage 계약에 묶어(drift 게이트) senderId=mockMe().id로 되돌린다(내 메시지 렌더).
    const echo: ChatMessage = {
      roomId: payload.roomId,
      messageId: `m-echo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      senderId: "u-e2e",
      content: payload.content,
      createdAt: new Date().toISOString(),
    };
    socket.emit("message", echo);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[mock-ws] listening on http://localhost:${PORT}`);
});
