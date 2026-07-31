import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  REFRESH_COOKIE,
  ACCESS_COOKIE_MAX_AGE,
  REFRESH_COOKIE_MAX_AGE,
  PAGE_ROUTES,
  cookieOptions,
} from "@/lib/constants";
import { refreshSession } from "@/lib/refresh";

const AUTH_PAGES = [PAGE_ROUTES.login, PAGE_ROUTES.signup];
const PROTECTED = [PAGE_ROUTES.dashboard];

// 인증을 새로 시작하는 경로. 여기서 갱신이 돌면 로그아웃 직후 남은 쿠키로
// 세션이 되살아나는 혼란이 생긴다. 갱신만 건너뛰고 리다이렉트 판정은 유지한다.
const NO_REFRESH_PREFIXES = [PAGE_ROUTES.login, PAGE_ROUTES.signup, "/api/session", "/api/auth"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const access = req.cookies.get(SESSION_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;

  // 액세스 토큰이 만료되면 쿠키도 같이 사라진다(수명을 맞춰뒀다).
  // 그래서 정상 흐름에서 마주치는 신호는 401이 아니라 "액세스 쿠키 부재"다.
  const needsRefresh =
    !access && Boolean(refresh) && !NO_REFRESH_PREFIXES.some((p) => pathname.startsWith(p));

  if (needsRefresh) {
    try {
      const pair = await refreshSession(refresh!);

      // 이번 요청의 Server Component·Route Handler가 새 토큰을 보게 한다.
      // 이걸 빼면 응답 쿠키는 심겼는데 이번 렌더는 토큰 없이 돌아 /login으로 튕긴다.
      req.cookies.set(SESSION_COOKIE, pair.accessToken);
      req.cookies.set(REFRESH_COOKIE, pair.refreshToken);

      const res = NextResponse.next({ request: { headers: req.headers } });
      // 브라우저가 다음 요청부터 쓸 쿠키. 회전했으므로 리프레시도 교체해야 한다.
      res.cookies.set(SESSION_COOKIE, pair.accessToken, cookieOptions(ACCESS_COOKIE_MAX_AGE));
      res.cookies.set(REFRESH_COOKIE, pair.refreshToken, cookieOptions(REFRESH_COOKIE_MAX_AGE));
      return res;
    } catch {
      // 무효·재사용 탐지·만료 모두 여기로 온다(BE가 의도적으로 401 하나로 묶었다).
      // 죽은 쿠키를 남기면 매 요청마다 갱신을 시도해 401을 반복하므로 지운다.
      const res = PROTECTED.some((p) => pathname.startsWith(p))
        ? NextResponse.redirect(new URL(PAGE_ROUTES.login, req.url))
        : NextResponse.next();
      res.cookies.delete(SESSION_COOKIE);
      res.cookies.delete(REFRESH_COOKIE);
      return res;
    }
  }

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (PROTECTED.some((p) => pathname.startsWith(p)) && !hasSession) {
    return NextResponse.redirect(new URL(PAGE_ROUTES.login, req.url));
  }
  if (AUTH_PAGES.some((p) => pathname.startsWith(p)) && hasSession) {
    return NextResponse.redirect(new URL(PAGE_ROUTES.dashboard, req.url));
  }
  return NextResponse.next();
}

// 갱신이 모든 앱 경로와 내부 API에서 일어나야 하므로 정적 자산만 제외하고 전부 잡는다.
// 기존 matcher(/dashboard·/login·/signup)로는 /board·/chat·/api/* 에서 갱신이 안 된다.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
