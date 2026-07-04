"use client";

import { useMutation } from "@tanstack/react-query";
import { API_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

type ToggleLikeInput = { postId: string; like: boolean };
type ToggleLikeResult = { liked: boolean; likeCount: number };

// POST(좋아요)/DELETE(취소) BFF 프록시. 실패 시 서버 메시지(없으면 기본 카피)로 throw.
async function toggleLike({ postId, like }: ToggleLikeInput): Promise<ToggleLikeResult> {
  const res = await fetch(API_ROUTES.postLikes(postId), {
    method: like ? "POST" : "DELETE",
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? MESSAGES.board.likeFailed);
  }
  return res.json();
}

export function useToggleLike() {
  return useMutation({ mutationFn: toggleLike });
}
