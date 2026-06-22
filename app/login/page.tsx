"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { loginSchema, type LoginInput } from "@/lib/schemas";
import { API_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onValid(data: LoginInput) {
    setServerError("");
    setLoading(true);
    const res = await fetch(API_ROUTES.session, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setLoading(false);
    if (res.ok) router.push("/dashboard");
    else setServerError((await res.json()).message ?? MESSAGES.auth.loginFailed);
  }

  return (
    <main className="flex-1 grid place-items-center px-6">
      <form onSubmit={handleSubmit(onValid)} className="w-full max-w-sm">
        <h1 className="mb-6 text-[24px] font-extrabold tracking-tight text-text">로그인</h1>
        <div className="flex flex-col gap-3">
          <Field label="이메일" type="email" error={errors.email?.message} {...register("email")} />
          <Field label="비밀번호" type="password" error={errors.password?.message} {...register("password")} />
        </div>
        {serverError && <p className="mt-3 text-[13px] text-danger">{serverError}</p>}
        <div className="mt-6">
          <Button type="submit" disabled={loading}>{loading ? "확인 중…" : "로그인"}</Button>
        </div>
        <p className="mt-5 text-center text-[14px] text-text-2">
          처음이신가요? <Link href="/signup" className="font-bold text-brand-600">회원가입</Link>
        </p>
      </form>
    </main>
  );
}
