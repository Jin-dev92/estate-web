import { BACKEND_URL } from "../env";
import { MESSAGES } from "../messages";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function call<T>(path: string, init: RequestInit, errorMap: Record<number, string>): Promise<T> {
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
