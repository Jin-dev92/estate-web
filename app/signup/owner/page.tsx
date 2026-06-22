"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { isEmail, isPassword } from "@/lib/validation";

export default function OwnerSignup() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name || !isEmail(form.email) || !isPassword(form.password)) {
      setError("입력값을 확인해주세요(비밀번호 8자 이상)"); return;
    }
    setLoading(true);
    const res = await fetch("/api/session/signup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, role: "OWNER" }),
    });
    setLoading(false);
    if (res.ok) router.push("/dashboard");
    else setError((await res.json()).message ?? "가입 실패");
  }

  return (
    <main className="flex-1 grid place-items-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm">
        <h1 className="mb-6 text-[24px] font-extrabold tracking-tight text-text">건물주 회원가입</h1>
        <div className="flex flex-col gap-3">
          <Field label="이름" value={form.name} onChange={set("name")} />
          <Field label="이메일" type="email" value={form.email} onChange={set("email")} />
          <Field label="비밀번호" type="password" value={form.password} onChange={set("password")} />
        </div>
        {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
        <div className="mt-6"><Button type="submit" disabled={loading}>{loading ? "가입 중…" : "가입하고 시작하기"}</Button></div>
      </form>
    </main>
  );
}
