import { BACKEND_URL } from "./env";
import { SignupRole } from "./constants";
import { MESSAGES } from "./messages";
export type { SignupRole };

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function call<T>(path: string, init: RequestInit, errorMap: Record<number, string>): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const msg = errorMap[res.status] ?? MESSAGES.common.requestFailed;
    throw new ApiError(res.status, msg);
  }
  return (await res.json()) as T;
}

export const backendSignup = (email: string, name: string, password: string, role: SignupRole) =>
  call<{ id: string; email: string; role: string }>("/auth/signup",
    { method: "POST", body: JSON.stringify({ email, name, password, role }) },
    { 400: MESSAGES.form.invalidInput, 409: MESSAGES.auth.emailInUse });

export const backendLogin = (email: string, password: string) =>
  call<{ accessToken: string }>("/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
    { 401: MESSAGES.auth.invalidCredentials });

export const backendPreviewInvite = (code: string) =>
  call<{ valid: boolean; buildingName?: string; unitName?: string }>(
    `/invite-codes/${encodeURIComponent(code)}/preview`, { method: "GET" }, {});

export const backendRedeemInvite = (token: string, code: string) =>
  call<{ id: string; unitId: string; status: string }>("/invite-codes/redeem",
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ code }) },
    { 404: MESSAGES.invite.invalid });
