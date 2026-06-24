import type { Notification } from "@/lib/api";
import { PAGE_ROUTES, NOTIFICATION_TYPE } from "@/lib/constants";

// 알림 → 이동 경로. 메시지=채팅방, 게시글/댓글=해당 글(buildingId 없으면 게시판 홈).
export function notificationHref(
  n: Pick<Notification, "type" | "entityId" | "buildingId">,
): string {
  if (n.type === NOTIFICATION_TYPE.MessageReceived) {
    return PAGE_ROUTES.chatRoom(n.entityId);
  }
  if (n.buildingId) return PAGE_ROUTES.boardPost(n.buildingId, n.entityId);
  return PAGE_ROUTES.boardHome;
}
