"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { isEmail, isPassword, isInviteCode } from "@/lib/validation";

function TenantSignupInner() {
  const router = useRouter();
  const prefill = useSearchParams().get("code") ?? "";
  const [step, setStep] = useState<"code" | "form" | "done">("code");
  const [code, setCode] = useState(prefill);
  const [unit, setUnit] = useState<{ buildingName?: string; unitName?: string }>({});
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function checkCode(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!isInviteCode(code)) { setError("초대코드를 입력하세요"); return; }
    setLoading(true);
    // 미인증 미리보기는 클라가 직접 백엔드 대신 자기 라우트로? → 단순화: 백엔드 직접(GET, 공개)
    const res = await fetch(`/api/invite-preview?code=${encodeURIComponent(code)}`);
    setLoading(false);
    const data = await res.json();
    if (data.valid) { setUnit(data); setStep("form"); }
    else setError("유효하지 않거나 만료된 초대코드입니다");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!form.name || !isEmail(form.email) || !isPassword(form.password)) {
      setError("입력값을 확인해주세요(비밀번호 8자 이상)"); return;
    }
    setLoading(true);
    const res = await fetch("/api/session/signup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, role: "TENANT", code }),
    });
    setLoading(false);
    if (res.ok) setStep("done");
    else {
      const d = await res.json();
      // redeem 경합(404): 코드 재입력으로
      if (d.status === 404) { setError("코드가 막 만료/사용되었어요. 다시 입력해주세요."); setStep("code"); }
      else setError(d.message ?? "가입 실패");
    }
  }

  return (
    <main className="flex-1 grid place-items-center px-6">
      <div className="w-full max-w-sm">
        {step === "code" && (
          <form onSubmit={checkCode}>
            <h1 className="mb-6 text-[24px] font-extrabold tracking-tight text-text">초대코드 입력</h1>
            <Field label="초대코드" value={code} onChange={(e) => setCode(e.target.value)} placeholder="예: A1B2C3D4" />
            {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
            <div className="mt-6"><Button type="submit" disabled={loading}>{loading ? "확인 중…" : "다음"}</Button></div>
          </form>
        )}
        {step === "form" && (
          <form onSubmit={submit}>
            <h1 className="mb-1 text-[24px] font-extrabold tracking-tight text-text">계정 만들기</h1>
            <p className="mb-6 text-[15px] text-text-2">
              <b className="text-text">{unit.buildingName} {unit.unitName}</b> 입주
            </p>
            <div className="flex flex-col gap-3">
              <Field label="이름" value={form.name} onChange={set("name")} />
              <Field label="이메일" type="email" value={form.email} onChange={set("email")} />
              <Field label="비밀번호" type="password" value={form.password} onChange={set("password")} />
            </div>
            {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
            <div className="mt-6"><Button type="submit" disabled={loading}>{loading ? "처리 중…" : "가입하고 입주하기"}</Button></div>
          </form>
        )}
        {step === "done" && (
          <div className="text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h1 className="text-[22px] font-extrabold text-text">{unit.buildingName} {unit.unitName} 입주 완료!</h1>
            <p className="mt-2 text-[15px] text-text-2">이제 공지·채팅으로 소통할 수 있어요.</p>
            <div className="mt-8"><Button onClick={() => router.push("/dashboard")}>홈으로</Button></div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function TenantSignup() {
  return (
    <Suspense fallback={<main className="flex-1 grid place-items-center px-6"><p>로딩 중…</p></main>}>
      <TenantSignupInner />
    </Suspense>
  );
}
