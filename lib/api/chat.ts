import { call, authGet } from "./client";

export type ChatRoom = {
  id: string;
  buildingId: string;
  ownerId: string;
  tenantId: string;
  lastMessage: { content: string; createdAt: string } | null;
};

export type ChatMessage = {
  roomId: string;
  messageId: string;
  senderId: string;
  content: string;
  createdAt: string; // ISO 8601
};

export const backendMyRooms = (t: string) => authGet<ChatRoom[]>("/chat/rooms", t);

export const backendRoomMessages = (t: string, roomId: string, limit = 50) =>
  authGet<ChatMessage[]>(`/chat/rooms/${roomId}/messages?limit=${limit}`, t);

export const backendEnsureRoom = (t: string, body: { buildingId: string; tenantId: string }) =>
  call<ChatRoom>("/chat/rooms", {
    method: "POST",
    headers: { Authorization: `Bearer ${t}` },
    body: JSON.stringify(body),
  }, {});
