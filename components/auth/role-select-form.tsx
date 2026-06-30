"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { API_ROUTES, KAKAO_ONBOARDING_KEY, PAGE_ROUTES, ROLE, type SignupRole } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

export function RoleSelectForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<SignupRole | null>(null);

  async function pick(role: SignupRole) {
    setError(null);
    setPending(role);
    const onboardingToken = sessionStorage.getItem(KAKAO_ONBOARDING_KEY);
    if (!onboardingToken) {
      setError(MESSAGES.auth.kakaoFailed);
      setPending(null);
      return;
    }
    const res = await fetch(API_ROUTES.kakaoComplete, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboardingToken, role }),
    });
    if (res.ok) {
      sessionStorage.removeItem(KAKAO_ONBOARDING_KEY);
      router.replace(PAGE_ROUTES.dashboard);
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.message ?? MESSAGES.auth.kakaoFailed);
      setPending(null);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-6 text-[24px] font-extrabold tracking-tight text-text">역할 선택</h1>
      <div className="flex flex-col gap-3">
        <Button onClick={() => pick(ROLE.OWNER)} disabled={pending !== null}>건물주</Button>
        <Button variant="secondary" onClick={() => pick(ROLE.TENANT)} disabled={pending !== null}>입주자</Button>
      </div>
      {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
    </div>
  );
}
