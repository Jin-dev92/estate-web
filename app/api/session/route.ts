import { NextRequest, NextResponse } from "next/server";
import { backendLogin, ApiError } from "@/lib/api";
import { setSession, clearSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const { accessToken } = await backendLogin(email, password);
    await setSession(accessToken);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = e as ApiError;
    return NextResponse.json({ message: err.message ?? "로그인 실패" }, { status: err.status ?? 500 });
  }
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
