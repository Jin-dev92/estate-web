"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PAGE_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { useEnsureRoom } from "@/lib/query/mutations/chat";

export function StartChatButton({
  buildingId,
  tenantId,
  label,
}: {
  buildingId: string;
  tenantId: string;
  label: string;
}) {
  const router = useRouter();
  const { mutate, isPending, error } = useEnsureRoom();

  function start() {
    mutate(
      { buildingId, tenantId },
      { onSuccess: (room) => router.push(PAGE_ROUTES.chatRoom(room.id)) },
    );
  }

  return (
    <div className="mt-4">
      <Button onClick={start} disabled={isPending}>
        {isPending ? MESSAGES.chat.starting : label}
      </Button>
      {error && <p className="mt-2 text-[13px] text-danger">{error.message}</p>}
    </div>
  );
}
