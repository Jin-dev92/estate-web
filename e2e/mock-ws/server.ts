import { createServer } from "node:http";
import { Server } from "socket.io";
import type { ChatMessage } from "../../lib/api";

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

io.on("connection", (socket) => {
  socket.on("join", () => {
    // 방 참여 ack 불필요 — 목은 단일 소켓 에코만 한다.
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
