import { beforeEach, vi } from "vitest";
import { backendRefresh, backendLogout } from "@/lib/api";

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

it("backendRefresh: Authorization 헤더 없이 refreshToken을 body로 POST한다", async () => {
  // /auth/refresh는 공개다 — 액세스 토큰이 만료된 뒤 부르는 경로라
  // Bearer를 붙일 토큰 자체가 없다.
  const fn = mockFetch(201, { accessToken: "a2", refreshToken: "r2" });
  const pair = await backendRefresh("r1");

  expect(pair).toEqual({ accessToken: "a2", refreshToken: "r2" });
  const [url, init] = fn.mock.calls[0];
  expect(String(url)).toContain("/auth/refresh");
  expect(init.method).toBe("POST");
  expect(JSON.parse(init.body)).toEqual({ refreshToken: "r1" });
  expect(init.headers.Authorization).toBeUndefined();
});

it("backendRefresh: 401이면 ApiError(401)를 던진다", async () => {
  // 무효 토큰과 재사용 탐지 둘 다 401이고 사용자 메시지가 같다(BE 의도 —
  // 공격자에게 내부 상태를 알리지 않는다). FE도 구분하지 않는다.
  mockFetch(401, { code: "AUTH_REFRESH_TOKEN_REUSED" });
  await expect(backendRefresh("r-stale")).rejects.toMatchObject({ status: 401 });
});

it("backendLogout: refreshToken을 body로 POST한다", async () => {
  const fn = mockFetch(201, {});
  await backendLogout("r1");

  const [url, init] = fn.mock.calls[0];
  expect(String(url)).toContain("/auth/logout");
  expect(init.method).toBe("POST");
  expect(JSON.parse(init.body)).toEqual({ refreshToken: "r1" });
});
