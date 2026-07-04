"use client";

import { useState } from "react";
import { MESSAGES } from "@/lib/messages";
import { useToggleLike } from "@/lib/query/mutations/like";

type Props = {
  postId: string;
  initialLikeCount: number;
  initialLikedByMe: boolean;
  variant?: "full" | "compact";
};

export function LikeButton({ postId, initialLikeCount, initialLikedByMe, variant = "full" }: Props) {
  const [liked, setLiked] = useState(initialLikedByMe);
  const [count, setCount] = useState(initialLikeCount);
  const { mutate } = useToggleLike();

  function toggle(e: React.MouseEvent) {
    // 목록 카드(Link) 내부에서도 쓰므로 이동/버블 차단.
    e.preventDefault();
    e.stopPropagation();

    const prevLiked = liked;
    const prevCount = count;
    const nextLiked = !prevLiked;

    // 낙관적 업데이트
    setLiked(nextLiked);
    setCount((c) => c + (nextLiked ? 1 : -1));

    mutate(
      { postId, like: nextLiked },
      {
        onSuccess: (data) => setCount(data.likeCount), // 서버 권위값으로 보정
        onError: () => { setLiked(prevLiked); setCount(prevCount); }, // 롤백
      },
    );
  }

  const size = variant === "compact" ? 16 : 20;
  const textSize = variant === "compact" ? "text-[12px]" : "text-[14px]";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={MESSAGES.board.like}
      aria-pressed={liked}
      className={`inline-flex items-center gap-1.5 ${textSize} font-semibold ${
        liked ? "text-danger" : "text-text-3"
      } hover:text-danger transition-colors`}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"}>
        <path
          d="M12 20s-7-4.35-9.5-8.5C1 8.5 2.5 5.5 5.5 5.5c1.8 0 3 1 2.5 2 .5-1 .7-2 2-2 3 0 4.5 3 3 6C19 15.65 12 20 12 20z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <span>{count}</span>
    </button>
  );
}
