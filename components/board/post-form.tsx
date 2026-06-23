"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { postSchema, type PostInput } from "@/lib/schemas";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { API_ROUTES, POST_CATEGORY } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

export function PostForm({ buildingId }: { buildingId: string }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<PostInput>({
    resolver: zodResolver(postSchema),
    defaultValues: { category: POST_CATEGORY.FREE, title: "", content: "" },
  });

  async function onValid(v: PostInput) {
    const res = await fetch(API_ROUTES.buildingPosts(buildingId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    if (res.ok) {
      reset();
      router.refresh();
    } else {
      const json = await res.json();
      setError("root", { message: json.message ?? MESSAGES.board.createFailed });
    }
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="mb-6 flex flex-col gap-2">
      <h2 className="text-[16px] font-bold text-text">새 글 작성</h2>
      <label className="block text-left">
        <span className="mb-1.5 block text-[13px] font-medium text-text-2">카테고리</span>
        <select
          {...register("category")}
          className="h-[50px] w-full rounded-[14px] border border-border bg-surface px-4 text-[15px] text-text outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50"
        >
          <option value={POST_CATEGORY.FREE}>자유</option>
          <option value={POST_CATEGORY.NOTICE}>공지</option>
        </select>
        {errors.category && <span className="mt-1 block text-[13px] text-danger">{errors.category.message}</span>}
      </label>
      <Field label="제목" {...register("title")} error={errors.title?.message} />
      <label className="block text-left">
        <span className="mb-1.5 block text-[13px] font-medium text-text-2">내용</span>
        <textarea
          {...register("content")}
          rows={4}
          className="w-full rounded-[14px] border border-border bg-surface px-4 py-3 text-[15px] text-text outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50 resize-none"
        />
        {errors.content && <span className="mt-1 block text-[13px] text-danger">{errors.content.message}</span>}
      </label>
      {errors.root && <p className="text-[13px] text-danger">{errors.root.message}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "등록 중…" : "글 등록"}
      </Button>
    </form>
  );
}
