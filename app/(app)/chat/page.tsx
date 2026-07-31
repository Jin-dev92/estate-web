import { redirect } from "next/navigation";
import Link from "next/link";
import { getToken } from "@/lib/session";
import { backendMe, backendMyRooms, type ChatRoom } from "@/lib/api";
import { chatRoomLabel, buildingNamesFor } from "@/lib/chat/room-label";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListRow } from "@/components/ui/list-row";
import { StartChatButton } from "@/components/chat/start-chat-button";
import { PAGE_ROUTES, ROLE } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

export default async function ChatListPage() {
  const token = await getToken();
  if (!token) redirect(PAGE_ROUTES.login);

  let me;
  try {
    me = await backendMe(token);
  } catch {
    redirect(PAGE_ROUTES.login);
  }

  let rooms: ChatRoom[];
  try {
    rooms = await backendMyRooms(token);
  } catch {
    rooms = [];
  }

  // buildingId → 건물명 매핑(역할별 소스). 채팅방 상세도 같은 라벨을 써야 해서
  // 조회 로직을 lib/chat/room-label.ts로 옮겼다.
  const { names: buildingNameById, activeBuildingId } = await buildingNamesFor(token, me.role);

  return (
    <>
      <h1 className="mb-4 text-[22px] font-extrabold tracking-tight">채팅</h1>
      {rooms.length === 0 ? (
        <>
          <EmptyState text={MESSAGES.chat.empty} />
          {me.role === ROLE.TENANT && activeBuildingId && (
            <StartChatButton buildingId={activeBuildingId} tenantId={me.id} label={MESSAGES.chat.startOwner} />
          )}
        </>
      ) : (
        <Card className="p-0">
          <div className="divide-y divide-border px-4">
            {rooms.map((r) => (
              <Link key={r.id} href={PAGE_ROUTES.chatRoom(r.id)} className="block hover:bg-surface-2">
                <ListRow
                  title={chatRoomLabel(r, me.role, buildingNameById)}
                  desc={r.lastMessage?.content}
                  meta={r.lastMessage ? new Date(r.lastMessage.createdAt).toLocaleDateString("ko-KR") : undefined}
                />
              </Link>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
