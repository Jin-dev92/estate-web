import { notificationHref } from "@/lib/notifications/notification-link";

it("메시지 알림 → 채팅방", () => {
  expect(notificationHref({ type: "MessageReceived", entityId: "room1", buildingId: null })).toBe("/chat/room1");
});

it("게시글 알림 → buildingId 있으면 board post", () => {
  expect(notificationHref({ type: "PostAdded", entityId: "p1", buildingId: "b1" })).toBe("/board/b1/p1");
});

it("게시글 알림 → buildingId 없으면 board 홈 폴백", () => {
  expect(notificationHref({ type: "CommentAdded", entityId: "p1", buildingId: null })).toBe("/board");
});
