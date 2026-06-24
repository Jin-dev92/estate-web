import { redirect } from "next/navigation";
import { getToken } from "@/lib/session";
import { backendMe, backendRoomMessages, type ChatMessage } from "@/lib/api";
import { toAscending } from "@/lib/chat/room-label";
import { ChatConversation } from "@/components/chat/chat-conversation";
import { PAGE_ROUTES } from "@/lib/constants";

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

  return (
    <>
      <ChatConversation token={token} roomId={roomId} myId={me.id} initial={toAscending(history)} />
    </>
  );
}
