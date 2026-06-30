import { NextRequest, NextResponse } from "next/server";
import { backendKakaoLogin, ApiError } from "@/lib/api";
import { setSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { code, redirectUri } = await req.json();
    const result = await backendKakaoLogin(code, redirectUri);
    if (result.accessToken) {
      await setSession(result.accessToken);
      return NextResponse.json({ next: "dashboard" });
    }
    return NextResponse.json({ next: "role-select", onboardingToken: result.onboardingToken });
  } catch (e) {
    const err = e as ApiError;
    return NextResponse.json({ message: err.message, status: err.status }, { status: err.status ?? 500 });
  }
}
