import { post, authGet, authPatch } from "./client";
import { MESSAGES } from "../messages";
import { SignupRole } from "../constants";
export type { SignupRole };

export type Me = { id: string; email: string; role: "OWNER" | "TENANT" | "ADMIN" };

/** 로그인·갱신이 함께 돌려주는 토큰 쌍. 회전 정책상 두 값은 항상 같이 바뀐다. */
export type TokenPair = { accessToken: string; refreshToken: string };

export const backendSignup = (email: string, name: string, password: string, role: SignupRole) =>
  post<{ id: string; email: string; role: string }>("/auth/signup",
    { email, name, password, role },
    { 400: MESSAGES.form.invalidInput, 409: MESSAGES.auth.emailInUse });

export const backendLogin = (email: string, password: string) =>
  post<TokenPair>("/auth/login",
    { email, password },
    { 401: MESSAGES.auth.invalidCredentials });

export const backendMe = (t: string) => authGet<Me>("/auth/me", t);

export type Profile = { id: string; email: string; name: string; role: "OWNER" | "TENANT" | "ADMIN" };

export const backendProfile = (t: string) => authGet<Profile>("/auth/profile", t);

export const backendUpdateProfile = (t: string, body: { name: string }) =>
  authPatch<Profile>("/auth/profile", t, body);

export const backendChangePassword = (t: string, body: { currentPassword: string; newPassword: string }) =>
  authPatch<{ ok: true }>("/auth/password", t, body, { 401: MESSAGES.settings.wrongCurrentPassword });

/**
 * 리프레시 토큰으로 새 토큰 쌍을 받는다. 공개 엔드포인트다 —
 * 액세스 토큰이 만료된 뒤 부르는 경로라 Bearer를 붙일 토큰이 없다.
 *
 * 응답의 refreshToken은 매번 새 값이다(회전). 반드시 교체 저장해야 하고,
 * 옛 토큰을 다시 제출하면 BE가 침해로 판정해 세션 가족 전체를 폐기한다.
 * 직접 부르지 말고 lib/refresh.ts의 refreshSession()을 경유한다(single-flight).
 */
export const backendRefresh = (refreshToken: string) =>
  post<TokenPair>("/auth/refresh", { refreshToken });

/** 서버 세션(리프레시 토큰 가족)을 폐기한다. 공개·멱등. */
export const backendLogout = (refreshToken: string) =>
  post<{ ok?: boolean }>("/auth/logout", { refreshToken });
