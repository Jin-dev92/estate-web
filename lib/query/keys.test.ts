import { qk } from "@/lib/query/keys";

it("notifications 쿼리키 팩토리", () => {
  expect(qk.notifications.list()).toEqual(["notifications", "list"]);
  expect(qk.notifications.unreadCount()).toEqual(["notifications", "unread-count"]);
});
