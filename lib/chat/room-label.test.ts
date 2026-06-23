import { chatRoomLabel, toAscending } from "@/lib/chat/room-label";
import type { ChatRoom, ChatMessage } from "@/lib/api";

const room: ChatRoom = { id: "r1", buildingId: "b1", ownerId: "o1", tenantId: "t1", lastMessage: null };

it("OWNER에게는 상대가 입주자로 표기된다", () => {
  const names = new Map([["b1", "행복빌라"]]);
  expect(chatRoomLabel(room, "OWNER", names)).toBe("행복빌라 · 입주자");
});

it("TENANT에게는 상대가 건물주로 표기된다", () => {
  const names = new Map([["b1", "행복빌라"]]);
  expect(chatRoomLabel(room, "TENANT", names)).toBe("행복빌라 · 건물주");
});

it("건물명을 모르면 '채팅방'으로 폴백한다", () => {
  expect(chatRoomLabel(room, "OWNER", new Map())).toBe("채팅방 · 입주자");
});

it("toAscending: 최신순 히스토리를 오래된→최신으로 뒤집는다", () => {
  const msgs: ChatMessage[] = [
    { roomId: "r1", messageId: "m2", senderId: "o1", content: "two", createdAt: "2026-06-20T00:00:02.000Z" },
    { roomId: "r1", messageId: "m1", senderId: "o1", content: "one", createdAt: "2026-06-20T00:00:01.000Z" },
  ];
  expect(toAscending(msgs).map((m) => m.messageId)).toEqual(["m1", "m2"]);
});
