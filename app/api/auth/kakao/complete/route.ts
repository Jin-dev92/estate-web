import { NextRequest, NextResponse } from "next/server";
import { backendKakaoComplete, ApiError } from "@/lib/api";
import { setSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { onboardingToken, role } = await req.json();
    const { accessToken } = await backendKakaoComplete(onboardingToken, role);
    await setSession(accessToken);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = e as ApiError;
    return NextResponse.json({ message: err.message, status: err.status }, { status: err.status ?? 500 });
  }
}
