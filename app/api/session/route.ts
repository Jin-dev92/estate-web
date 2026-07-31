import { NextRequest, NextResponse } from "next/server";
import { backendLogin, ApiError } from "@/lib/api";
import { setSessionPair, clearSession } from "@/lib/session";
import { MESSAGES } from "@/lib/messages";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const { accessToken, refreshToken } = await backendLogin(email, password);
    await setSessionPair(accessToken, refreshToken);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = e as ApiError;
    return NextResponse.json({ message: err.message ?? MESSAGES.auth.loginFailed }, { status: err.status ?? 500 });
  }
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
