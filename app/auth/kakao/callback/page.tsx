"use client";

import { Suspense, startTransition, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_ROUTES, KAKAO_NEXT, KAKAO_ONBOARDING_KEY, KAKAO_STATE_KEY, PAGE_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

function KakaoCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const code = params.get("code");
    const state = params.get("state");
    const saved = sessionStorage.getItem(KAKAO_STATE_KEY);
    if (!code || !state || state !== saved) {
      startTransition(() => setError(MESSAGES.auth.kakaoFailed));
      return;
    }
    sessionStorage.removeItem(KAKAO_STATE_KEY);
    const redirectUri = `${window.location.origin}${PAGE_ROUTES.kakaoCallback}`;
    fetch(API_ROUTES.kakao, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirectUri }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          setError(json.message ?? MESSAGES.auth.kakaoFailed);
          return;
        }
        if (json.next === KAKAO_NEXT.DASHBOARD) {
          router.replace(PAGE_ROUTES.dashboard);
        } else {
          sessionStorage.setItem(KAKAO_ONBOARDING_KEY, json.onboardingToken);
          router.replace(PAGE_ROUTES.roleSelect);
        }
      })
      .catch(() => setError(MESSAGES.auth.kakaoFailed));
  }, [params, router]);

  if (error) {
    return <p className="text-[14px] text-danger">{error}</p>;
  }
  return <p className="text-[14px] text-text-3">로그인 처리 중…</p>;
}

export default function KakaoCallbackPage() {
  return (
    <main className="flex-1 grid place-items-center px-6">
      <Suspense fallback={<p className="text-[14px] text-text-3">로그인 처리 중…</p>}>
        <KakaoCallbackInner />
      </Suspense>
    </main>
  );
}
