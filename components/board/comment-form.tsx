"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { commentSchema, type CommentInput } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { API_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

export function CommentForm({ postId }: { postId: string }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<CommentInput>({ resolver: zodResolver(commentSchema) });

  async function onValid(v: CommentInput) {
    const res = await fetch(API_ROUTES.postComments(postId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    if (res.ok) {
      reset();
      router.refresh();
    } else {
      const json = await res.json();
      setError("root", { message: json.message ?? MESSAGES.comment.createFailed });
    }
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="mt-4 flex flex-col gap-2">
      <h3 className="text-[15px] font-bold text-text">댓글 작성</h3>
      <label className="block text-left">
        <textarea
          {...register("content")}
          rows={3}
          placeholder="댓글을 입력하세요"
          className="w-full rounded-[14px] border border-border bg-surface px-4 py-3 text-[15px] text-text outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50 resize-none"
        />
        {errors.content && <span className="mt-1 block text-[13px] text-danger">{errors.content.message}</span>}
      </label>
      {errors.root && <p className="text-[13px] text-danger">{errors.root.message}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "등록 중…" : "댓글 등록"}
      </Button>
    </form>
  );
}
