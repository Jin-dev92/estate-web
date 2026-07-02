import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./constants";

export function sessionCookie(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    options: {
      httpOnly: true as const,
      // 실서비스(HTTPS)에선 secure. 단 E2E는 프로덕션 빌드를 http://localhost로 띄우는데
      // webkit은 localhost에서도 secure 쿠키를 저장하지 않아(chromium/firefox는 예외 허용)
      // 세션이 안 잡힌다. E2E_INSECURE_COOKIE=1일 때만 secure를 꺼 이 환경 아티팩트를 회피한다.
      secure: process.env.NODE_ENV === "production" && process.env.E2E_INSECURE_COOKIE !== "1",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60, // access token 수명에 맞춰 후속 조정
    },
  };
}

export async function setSession(token: string) {
  const c = sessionCookie(token);
  (await cookies()).set(c.name, c.value, c.options);
}
export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
export async function getToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}
