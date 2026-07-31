import { call } from "./client";
import { MESSAGES } from "../messages";
import type { SignupRole } from "../constants";
import type { TokenPair } from "./auth";

/**
 * 기존 유저면 토큰 쌍, 신규 유저면 onboardingToken을 준다 —
 * 둘 중 하나만 오는 유니온이므로 호출부에서 분기해야 한다.
 */
export type KakaoLoginResult = {
  accessToken?: string;
  refreshToken?: string;
  onboardingToken?: string;
};

export const backendKakaoLogin = (code: string, redirectUri: string) =>
  call<KakaoLoginResult>("/auth/kakao", {
    method: "POST",
    body: JSON.stringify({ code, redirectUri }),
  }, { 400: MESSAGES.auth.kakaoEmailRequired });

export const backendKakaoComplete = (onboardingToken: string, role: SignupRole) =>
  call<TokenPair>("/auth/kakao/complete", {
    method: "POST",
    body: JSON.stringify({ onboardingToken, role }),
  }, { 409: MESSAGES.auth.emailInUse });
