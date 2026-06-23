// 클라이언트가 socket.io로 직접 연결하는 BE 공개 호스트(비밀 아님).
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001";
