import { authGet } from "./client";

export type ChatRoom = { id: string; buildingId?: string };

export const backendChatRooms = (t: string) => authGet<ChatRoom[]>("/chat/rooms", t);
