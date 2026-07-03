"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { loginSchema, type LoginInput } from "@/lib/schemas";
import { API_ROUTES, kakaoAuthorizeUrl, KAKAO_STATE_KEY, PAGE_ROUTES } from "@/lib/constants";
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

  function loginWithKakao() {
    const state = crypto.randomUUID();
    sessionStorage.setItem(KAKAO_STATE_KEY, state);
    const redirectUri = `${window.location.origin}${PAGE_ROUTES.kakaoCallback}`;
    window.location.href = kakaoAuthorizeUrl(redirectUri, state);
  }

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
          <Button type="submit" disabled={loading}>{loading ? "확인 중…" : MESSAGES.auth.login}</Button>
        </div>
        <p className="mt-5 text-center text-[14px] text-text-2">
          처음이신가요? <Link href="/signup" className="font-bold text-brand-600">회원가입</Link>
        </p>
        <div className="mt-8 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[12px] text-text-3">{MESSAGES.auth.socialLoginDivider}</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <ul className="mt-4 flex justify-center gap-4">
          <li className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={loginWithKakao}
              aria-label={MESSAGES.auth.kakaoLogin}
              className="grid h-12 w-12 place-items-center rounded-full bg-[#FEE500] transition-transform hover:scale-105"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-[#191600]">
                <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.76 1.86 5.19 4.66 6.58-.15.53-.96 3.36-.99 3.58 0 0-.02.16.08.22.1.06.23.01.23.01.3-.04 3.47-2.28 4.02-2.67.66.1 1.34.15 2.02.15 5.52 0 10-3.48 10-7.77S17.52 3 12 3z" />
              </svg>
            </button>
            <span className="text-[12px] text-text-3">{MESSAGES.auth.kakaoLabel}</span>
          </li>
        </ul>
      </form>
    </main>
  );
}
