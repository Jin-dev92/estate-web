"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { API_ROUTES, PAGE_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    const res = await fetch(API_ROUTES.chatRooms, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buildingId, tenantId }),
    });
    if (res.ok) {
      const room = await res.json();
      router.push(PAGE_ROUTES.chatRoom(room.id));
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.message ?? MESSAGES.chat.startFailed);
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <Button onClick={start} disabled={loading}>
        {loading ? "여는 중…" : label}
      </Button>
      {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
    </div>
  );
}
