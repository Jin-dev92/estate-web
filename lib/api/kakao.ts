import { call } from "./client";
import { MESSAGES } from "../messages";
import type { SignupRole } from "../constants";

export type KakaoLoginResult = { accessToken?: string; onboardingToken?: string };

export const backendKakaoLogin = (code: string, redirectUri: string) =>
  call<KakaoLoginResult>("/auth/kakao", {
    method: "POST",
    body: JSON.stringify({ code, redirectUri }),
  }, { 400: MESSAGES.auth.kakaoEmailRequired });

export const backendKakaoComplete = (onboardingToken: string, role: SignupRole) =>
  call<{ accessToken: string }>("/auth/kakao/complete", {
    method: "POST",
    body: JSON.stringify({ onboardingToken, role }),
  }, { 409: MESSAGES.auth.emailInUse });
