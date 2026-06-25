"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { passwordSchema, type PasswordInput } from "@/lib/schemas";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { API_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

export function PasswordForm() {
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<PasswordInput>({ resolver: zodResolver(passwordSchema) });

  async function onValid(v: PasswordInput) {
    setDone(false);
    const res = await fetch(API_ROUTES.profilePassword, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    if (res.ok) {
      reset();
      setDone(true);
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
      {done && <p className="text-[13px] text-brand-600">{MESSAGES.settings.passwordChanged}</p>}
      <Button type="submit" disabled={isSubmitting}>{MESSAGES.settings.changePassword}</Button>
    </form>
  );
}
