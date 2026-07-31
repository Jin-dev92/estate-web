import { NextRequest, NextResponse } from "next/server";
import { backendKakaoLogin, ApiError } from "@/lib/api";
import { setSessionPair } from "@/lib/session";
import { KAKAO_NEXT } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const { code, redirectUri } = await req.json();
    const result = await backendKakaoLogin(code, redirectUri);
    // 기존 유저면 토큰 쌍, 신규 유저면 onboardingToken이 온다(유니온).
    if (result.accessToken && result.refreshToken) {
      await setSessionPair(result.accessToken, result.refreshToken);
      return NextResponse.json({ next: KAKAO_NEXT.DASHBOARD });
    }
    return NextResponse.json({ next: KAKAO_NEXT.ROLE_SELECT, onboardingToken: result.onboardingToken });
  } catch (e) {
    const err = e as ApiError;
    return NextResponse.json({ message: err.message, status: err.status }, { status: err.status ?? 500 });
  }
}
