"use client";

import { useMutation } from "@tanstack/react-query";
import { API_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

type EnsureRoomInput = { buildingId: string; tenantId: string };
type EnsureRoomResult = { id: string };

// POST /api/chat/rooms 프록시. 실패 시 서버 메시지(없으면 기본 카피)로 throw.
async function ensureRoom(input: EnsureRoomInput): Promise<EnsureRoomResult> {
  const res = await fetch(API_ROUTES.chatRooms, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? MESSAGES.chat.startFailed);
  }
  return res.json();
}

export function useEnsureRoom() {
  return useMutation({ mutationFn: ensureRoom });
}
