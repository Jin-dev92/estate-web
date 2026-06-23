import { redirect } from "next/navigation";
import Link from "next/link";
import { getToken } from "@/lib/session";
import { backendMe, backendMyRooms, backendMyBuildings, backendMyLeases, type ChatRoom } from "@/lib/api";
import { chatRoomLabel } from "@/lib/chat/room-label";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListRow } from "@/components/ui/list-row";
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

  // buildingId → 건물명 매핑(역할별 소스).
  const buildingNameById = new Map<string, string>();
  if (me.role === ROLE.OWNER) {
    try {
      (await backendMyBuildings(token)).forEach((b) => buildingNameById.set(b.id, b.name));
    } catch {}
  } else {
    try {
      (await backendMyLeases(token)).forEach((l) => {
        if (l.buildingId && l.buildingName) buildingNameById.set(l.buildingId, l.buildingName);
      });
    } catch {}
  }

  const initial = me.email.charAt(0).toUpperCase();

  return (
    <AppShell unread={0} userInitial={initial}>
      <h1 className="mb-4 text-[22px] font-extrabold tracking-tight">채팅</h1>
      {rooms.length === 0 ? (
        <EmptyState text={MESSAGES.chat.empty} />
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
    </AppShell>
  );
}
