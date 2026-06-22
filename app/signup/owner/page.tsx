"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { signupSchema, type SignupInput } from "@/lib/schemas";
import { ROLE, API_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

export default function OwnerSignup() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });

  async function onValid(data: SignupInput) {
    setServerError("");
    setLoading(true);
    const res = await fetch(API_ROUTES.signup, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, role: ROLE.OWNER }),
    });
    setLoading(false);
    if (res.ok) router.push("/dashboard");
    else setServerError((await res.json()).message ?? MESSAGES.auth.signupFailed);
  }

  return (
    <main className="flex-1 grid place-items-center px-6">
      <form onSubmit={handleSubmit(onValid)} className="w-full max-w-sm">
        <h1 className="mb-6 text-[24px] font-extrabold tracking-tight text-text">건물주 회원가입</h1>
        <div className="flex flex-col gap-3">
          <Field label="이름" error={errors.name?.message} {...register("name")} />
          <Field label="이메일" type="email" error={errors.email?.message} {...register("email")} />
          <Field label="비밀번호" type="password" error={errors.password?.message} {...register("password")} />
        </div>
        {serverError && <p className="mt-3 text-[13px] text-danger">{serverError}</p>}
        <div className="mt-6">
          <Button type="submit" disabled={loading}>{loading ? "가입 중…" : "가입하고 시작하기"}</Button>
        </div>
      </form>
    </main>
  );
}
