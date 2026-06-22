import { sessionCookie } from "@/lib/session";

it("httpOnly+SameSite=lax 쿠키 옵션", () => {
  const c = sessionCookie("tok");
  expect(c.name).toBe("session");
  expect(c.value).toBe("tok");
  expect(c.options.httpOnly).toBe(true);
  expect(c.options.sameSite).toBe("lax");
});
