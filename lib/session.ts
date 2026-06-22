import { cookies } from "next/headers";

const NAME = "session";

export function sessionCookie(token: string) {
  return {
    name: NAME,
    value: token,
    options: {
      httpOnly: true as const,
      secure: process.env.NODE_ENV === "production",
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
  (await cookies()).delete(NAME);
}
export async function getToken(): Promise<string | null> {
  return (await cookies()).get(NAME)?.value ?? null;
}
