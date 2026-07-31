import { redirect } from "next/navigation";
import Link from "next/link";
import { getToken } from "@/lib/session";
import { backendMe, backendRoomMessages, backendMyRooms, type ChatMessage } from "@/lib/api";
import { toAscending, chatRoomLabel, buildingNamesFor } from "@/lib/chat/room-label";
import { ChatConversation } from "@/components/chat/chat-conversation";
import { PAGE_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const token = await getToken();
  if (!token) redirect(PAGE_ROUTES.login);

  const { roomId } = await params;

  let me;
  try {
    me = await backendMe(token);
  } catch {
    redirect(PAGE_ROUTES.login);
  }

  let history: ChatMessage[];
  try {
    history = await backendRoomMessages(token, roomId);
  } catch {
    history = [];
  }

  // 어느 건물의 누구와 하는 대화인지 헤더에 보여준다. 없으면 방에 들어와도
  // 상대를 알 수 없어 목록으로 되돌아가야 확인된다.
  let title = "";
  try {
    const room = (await backendMyRooms(token)).find((r) => r.id === roomId);
    if (room) {
      const { names } = await buildingNamesFor(token, me.role);
      title = chatRoomLabel(room, me.role, names);
    }
  } catch {
    // 라벨 조회 실패는 대화 자체를 막지 않는다 — 제목 없이 렌더한다.
  }

  return (
    <>
      <div className="mb-4">
        <Link
          href={PAGE_ROUTES.chat}
          className="inline-flex items-center gap-1 text-[13px] text-text-2 hover:text-text"
        >
          <span aria-hidden="true">←</span> {MESSAGES.chat.backToList}
        </Link>
        {title && <h1 className="mt-1 text-[20px] font-extrabold tracking-tight">{title}</h1>}
      </div>
      <ChatConversation token={token} roomId={roomId} myId={me.id} initial={toAscending(history)} />
    </>
  );
}
