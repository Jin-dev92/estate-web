import { sessionCookie, refreshCookie } from "@/lib/session";
import {
  SESSION_COOKIE,
  REFRESH_COOKIE,
  ACCESS_COOKIE_MAX_AGE,
  REFRESH_COOKIE_MAX_AGE,
} from "@/lib/constants";

it("httpOnly+SameSite=lax 쿠키 옵션", () => {
  const c = sessionCookie("tok");
  expect(c.name).toBe(SESSION_COOKIE);
  expect(c.value).toBe("tok");
  expect(c.options.httpOnly).toBe(true);
  expect(c.options.sameSite).toBe("lax");
});

it("액세스 쿠키 수명은 액세스 토큰 수명(15분)과 같다", () => {
  // 쿠키가 토큰보다 오래 남으면 만료된 토큰으로 BE를 불러 401을 맞는다.
  // 짧으면 멀쩡한 토큰을 버린다. 두 값은 같아야 한다.
  expect(sessionCookie("tok").options.maxAge).toBe(ACCESS_COOKIE_MAX_AGE);
  expect(ACCESS_COOKIE_MAX_AGE).toBe(60 * 15);
});

it("리프레시 쿠키도 httpOnly+SameSite=lax, 수명 14일", () => {
  const c = refreshCookie("rtok");
  expect(c.name).toBe(REFRESH_COOKIE);
  expect(c.value).toBe("rtok");
  expect(c.options.httpOnly).toBe(true);
  expect(c.options.sameSite).toBe("lax");
  expect(c.options.maxAge).toBe(REFRESH_COOKIE_MAX_AGE);
  expect(REFRESH_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 14);
});

it("리프레시 쿠키 path는 / — proxy가 모든 경로에서 읽어야 갱신이 된다", () => {
  expect(refreshCookie("rtok").options.path).toBe("/");
});

it("액세스·리프레시 쿠키 이름은 서로 다르다", () => {
  // 같으면 한쪽이 다른 쪽을 덮어써 갱신이 영구히 실패한다.
  expect(REFRESH_COOKIE).not.toBe(SESSION_COOKIE);
});
