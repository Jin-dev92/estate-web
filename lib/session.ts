import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  REFRESH_COOKIE,
  ACCESS_COOKIE_MAX_AGE,
  REFRESH_COOKIE_MAX_AGE,
  cookieOptions,
} from "./constants";

export function sessionCookie(token: string) {
  return { name: SESSION_COOKIE, value: token, options: cookieOptions(ACCESS_COOKIE_MAX_AGE) };
}

export function refreshCookie(token: string) {
  return { name: REFRESH_COOKIE, value: token, options: cookieOptions(REFRESH_COOKIE_MAX_AGE) };
}

export async function setSession(token: string) {
  const c = sessionCookie(token);
  (await cookies()).set(c.name, c.value, c.options);
}

/**
 * 액세스·리프레시를 함께 심는다. 갱신은 회전이라 두 값은 항상 쌍으로 바뀐다 —
 * 한쪽만 갱신하면 다음 갱신에서 옛 리프레시 토큰을 제출해 가족이 폐기된다.
 */
export async function setSessionPair(accessToken: string, refreshToken: string) {
  const jar = await cookies();
  const a = sessionCookie(accessToken);
  const r = refreshCookie(refreshToken);
  jar.set(a.name, a.value, a.options);
  jar.set(r.name, r.value, r.options);
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

export async function getToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  return (await cookies()).get(REFRESH_COOKIE)?.value ?? null;
}
