import type { ChatRoom, ChatMessage } from "@/lib/api";
import { ROLE } from "@/lib/constants";

// 상대 역할: 내가 OWNER면 상대는 입주자, 그 외(TENANT)면 건물주.
function counterpartLabel(myRole: "OWNER" | "TENANT" | "ADMIN"): string {
  return myRole === ROLE.OWNER ? "입주자" : "건물주";
}

export function chatRoomLabel(
  room: ChatRoom,
  myRole: "OWNER" | "TENANT" | "ADMIN",
  buildingNameById: Map<string, string>,
): string {
  const building = buildingNameById.get(room.buildingId) ?? "채팅방";
  return `${building} · ${counterpartLabel(myRole)}`;
}

// BE 히스토리는 최신순 → 화면 표시용 오래된→최신.
export function toAscending(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].reverse();
}
