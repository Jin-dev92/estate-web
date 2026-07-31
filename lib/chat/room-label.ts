import { backendMyBuildings, backendMyLeases, type ChatRoom, type ChatMessage } from "@/lib/api";
import { ROLE, LEASE_STATUS } from "@/lib/constants";

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

/**
 * buildingId → 건물명 매핑. 출처가 역할별로 다르다 — OWNER는 보유 건물,
 * TENANT는 임대 계약이다. 채팅 목록과 채팅방 상세가 같은 라벨을 써야 하므로
 * 여기 한 곳에 둔다.
 *
 * activeBuildingId는 TENANT의 진행 중 계약 건물(문의 시작 버튼이 쓴다).
 */
export async function buildingNamesFor(
  token: string,
  role: "OWNER" | "TENANT" | "ADMIN",
): Promise<{ names: Map<string, string>; activeBuildingId: string | null }> {
  const names = new Map<string, string>();
  if (role === ROLE.OWNER) {
    try {
      (await backendMyBuildings(token)).forEach((b) => names.set(b.id, b.name));
    } catch {
      // 조회 실패 시 라벨이 기본값("채팅방")으로 degrade — 화면은 계속 뜬다.
    }
    return { names, activeBuildingId: null };
  }
  try {
    const leases = await backendMyLeases(token);
    leases.forEach((l) => {
      if (l.buildingId && l.buildingName) names.set(l.buildingId, l.buildingName);
    });
    const active = leases.find((l) => l.status === LEASE_STATUS.ACTIVE && l.buildingId)?.buildingId ?? null;
    return { names, activeBuildingId: active };
  } catch {
    return { names, activeBuildingId: null };
  }
}
