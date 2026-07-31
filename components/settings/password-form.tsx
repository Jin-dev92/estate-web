"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { passwordSchema, type PasswordInput } from "@/lib/schemas";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { API_ROUTES, PAGE_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

export function PasswordForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<PasswordInput>({ resolver: zodResolver(passwordSchema) });

  async function onValid(v: PasswordInput) {
    const res = await fetch(API_ROUTES.profilePassword, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    if (res.ok) {
      reset();
      // BE가 비밀번호 변경 성공 시 본인 포함 전체 세션을 폐기한다.
      // 쿠키를 남기면 서버 세션이 죽은 상태로 앱을 쓰다가 알 수 없는 실패를 만난다.
      await fetch(API_ROUTES.session, { method: "DELETE" });
      router.replace(PAGE_ROUTES.login);
    } else {
      const json = await res.json().catch(() => ({}));
      setError("root", { message: json.message ?? MESSAGES.settings.updateFailed });
    }
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-3">
      <Field label={MESSAGES.settings.currentPassword} type="password" {...register("currentPassword")} error={errors.currentPassword?.message} />
      <Field label={MESSAGES.settings.newPassword} type="password" {...register("newPassword")} error={errors.newPassword?.message} />
      {errors.root && <p className="text-[13px] text-danger">{errors.root.message}</p>}
      <Button type="submit" disabled={isSubmitting}>{MESSAGES.settings.changePassword}</Button>
    </form>
  );
}
