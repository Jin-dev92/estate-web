import { NextRequest, NextResponse } from "next/server";
import { backendSignup, backendLogin, backendRedeemInvite, ApiError } from "@/lib/api";
import { setSession } from "@/lib/session";
import { ROLE } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const { email, name, password, role, code } = await req.json();
    await backendSignup(email, name, password, role);          // 1) 가입
    const { accessToken } = await backendLogin(email, password); // 2) 자동 로그인(토큰 미발급 대응)
    if (role === ROLE.TENANT && code) {
      await backendRedeemInvite(accessToken, code);            // 3) 입주(redeem)
    }
    await setSession(accessToken);                              // 4) httpOnly 쿠키
    return NextResponse.json({ ok: true, role });
  } catch (e) {
    const err = e as ApiError;
    // redeem 경합(404): 계정은 생성됐으므로 클라가 "코드 재입력"으로 보냄
    return NextResponse.json(
      { message: err.message ?? "가입 처리 실패", status: err.status },
      { status: err.status ?? 500 },
    );
  }
}
