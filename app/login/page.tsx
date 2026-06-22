"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { isEmail, isPassword } from "@/lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!isEmail(email) || !isPassword(password)) { setError("이메일/비밀번호를 확인하세요"); return; }
    setLoading(true);
    const res = await fetch("/api/session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) router.push("/dashboard");
    else setError((await res.json()).message ?? "로그인 실패");
  }

  return (
    <main className="flex-1 grid place-items-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm">
        <h1 className="mb-6 text-[24px] font-extrabold tracking-tight text-text">로그인</h1>
        <div className="flex flex-col gap-3">
          <Field label="이메일" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
        <div className="mt-6"><Button type="submit" disabled={loading}>{loading ? "확인 중…" : "로그인"}</Button></div>
        <p className="mt-5 text-center text-[14px] text-text-2">
          처음이신가요? <Link href="/signup" className="font-bold text-brand-600">회원가입</Link>
        </p>
      </form>
    </main>
  );
}
