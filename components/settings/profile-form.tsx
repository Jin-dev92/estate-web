"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { profileSchema, type ProfileInput } from "@/lib/schemas";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { API_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

export function ProfileForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues: { name: defaultName } });

  async function onValid(v: ProfileInput) {
    const res = await fetch(API_ROUTES.profile, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const json = await res.json().catch(() => ({}));
      setError("root", { message: json.message ?? MESSAGES.settings.updateFailed });
    }
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-3">
      <Field label={MESSAGES.settings.name} {...register("name")} error={errors.name?.message} />
      {errors.root && <p className="text-[13px] text-danger">{errors.root.message}</p>}
      <Button type="submit" disabled={isSubmitting}>{MESSAGES.settings.saveName}</Button>
    </form>
  );
}
