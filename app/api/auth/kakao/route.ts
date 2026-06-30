import { NextRequest, NextResponse } from "next/server";
import { backendKakaoLogin, ApiError } from "@/lib/api";
import { setSession } from "@/lib/session";
import { KAKAO_NEXT } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const { code, redirectUri } = await req.json();
    const result = await backendKakaoLogin(code, redirectUri);
    if (result.accessToken) {
      await setSession(result.accessToken);
      return NextResponse.json({ next: KAKAO_NEXT.DASHBOARD });
    }
    return NextResponse.json({ next: KAKAO_NEXT.ROLE_SELECT, onboardingToken: result.onboardingToken });
  } catch (e) {
    const err = e as ApiError;
    return NextResponse.json({ message: err.message, status: err.status }, { status: err.status ?? 500 });
  }
}
