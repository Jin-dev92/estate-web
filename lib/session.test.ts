import { sessionCookie } from "@/lib/session";
import { SESSION_COOKIE } from "@/lib/constants";

it("httpOnly+SameSite=lax 쿠키 옵션", () => {
  const c = sessionCookie("tok");
  expect(c.name).toBe(SESSION_COOKIE);
  expect(c.value).toBe("tok");
  expect(c.options.httpOnly).toBe(true);
  expect(c.options.sameSite).toBe("lax");
});
