import { BACKEND_URL } from "../env";
import { MESSAGES } from "../messages";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function call<T>(path: string, init: RequestInit, errorMap: Record<number, string> = {}): Promise<T> {
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

export function authGet<T>(path: string, token: string) {
  return call<T>(path, { method: "GET", headers: { Authorization: `Bearer ${token}` } },
    { 401: MESSAGES.auth.invalidCredentials });
}

// 비인증 POST — signup, login 등
export function post<T>(path: string, body: unknown, errorMap: Record<number, string> = {}) {
  return call<T>(path, { method: "POST", body: JSON.stringify(body) }, errorMap);
}

// 인증 POST — body 선택(없는 요청도 동일 헬퍼로 커버)
export function authPost<T>(path: string, token: string, body?: unknown, errorMap: Record<number, string> = {}) {
  return call<T>(path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  }, errorMap);
}

// 인증 PATCH — body 선택(notification처럼 body 없는 요청 커버)
export function authPatch<T>(path: string, token: string, body?: unknown, errorMap: Record<number, string> = {}) {
  return call<T>(path, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  }, errorMap);
}
