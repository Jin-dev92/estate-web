import { NextRequest, NextResponse } from "next/server";
import { backendLogin, backendLogout, ApiError } from "@/lib/api";
import { setSessionPair, clearSession, getRefreshToken } from "@/lib/session";
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
  // 서버 세션(리프레시 토큰 가족)을 먼저 폐기한다. 이걸 빼면 쿠키만 지워지고
  // 리프레시 토큰이 14일간 서버에 살아있다.
  const refresh = await getRefreshToken();
  if (refresh) {
    try {
      await backendLogout(refresh);
    } catch {
      // BE 폐기 실패로 로그아웃을 막지 않는다 — 쿠키를 남기면 사용자는
      // 버튼을 눌렀는데도 로그인 상태로 남는다. BE 세션은 14일 뒤 만료된다.
    }
  }
  await clearSession();
  return NextResponse.json({ ok: true });
}
