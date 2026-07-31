import { beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import {
  SESSION_COOKIE,
  REFRESH_COOKIE,
  ACCESS_COOKIE_MAX_AGE,
  REFRESH_COOKIE_MAX_AGE,
  PAGE_ROUTES,
  API_ROUTES,
} from "@/lib/constants";
import { config } from "@/proxy";

const refreshSession = vi.fn();
vi.mock("@/lib/refresh", () => ({ refreshSession: (t: string) => refreshSession(t) }));

async function freshProxy() {
  vi.resetModules();
  const mod = await import("@/proxy");
  return mod.proxy;
}

// 쿠키를 실어 요청을 만든다. 액세스 토큰이 없는 상태를 표현하려면 access를 생략한다.
function makeReq(path: string, cookies: { access?: string; refresh?: string } = {}) {
  const req = new NextRequest(new URL(`http://localhost${path}`));
  if (cookies.access) req.cookies.set(SESSION_COOKIE, cookies.access);
  if (cookies.refresh) req.cookies.set(REFRESH_COOKIE, cookies.refresh);
  return req;
}

beforeEach(() => {
  refreshSession.mockReset();
});

it("액세스 쿠키가 있으면 갱신하지 않는다", async () => {
  const proxy = await freshProxy();
  await proxy(makeReq(PAGE_ROUTES.dashboard, { access: "a1", refresh: "r1" }));
  expect(refreshSession).not.toHaveBeenCalled();
});

it("액세스 없고 리프레시만 있으면 갱신한다", async () => {
  const proxy = await freshProxy();
  refreshSession.mockResolvedValue({ accessToken: "a2", refreshToken: "r2" });

  await proxy(makeReq(PAGE_ROUTES.dashboard, { refresh: "r1" }));

  expect(refreshSession).toHaveBeenCalledWith("r1");
});

it("갱신 성공 시 새 토큰 쌍을 응답 쿠키에 심는다", async () => {
  const proxy = await freshProxy();
  refreshSession.mockResolvedValue({ accessToken: "a2", refreshToken: "r2" });

  const res = await proxy(makeReq(PAGE_ROUTES.dashboard, { refresh: "r1" }));

  expect(res.cookies.get(SESSION_COOKIE)?.value).toBe("a2");
  // 회전한 리프레시 토큰도 교체 저장해야 한다 — 안 하면 다음 갱신에서
  // 옛 토큰을 제출해 가족이 폐기된다.
  expect(res.cookies.get(REFRESH_COOKIE)?.value).toBe("r2");
  // 쿠키 수명 = 토큰 수명이 갱신 트리거 신호다. cookieOptions가 빠지면
  // 액세스 쿠키가 세션 쿠키가 되어 15분 뒤에도 안 사라지고, 갱신이 조용히 멈춘다.
  expect(res.cookies.get(SESSION_COOKIE)?.maxAge).toBe(ACCESS_COOKIE_MAX_AGE);
  expect(res.cookies.get(REFRESH_COOKIE)?.maxAge).toBe(REFRESH_COOKIE_MAX_AGE);
});

it("갱신 성공 시 이번 요청의 렌더 코드도 새 액세스 토큰을 본다", async () => {
  // 응답 쿠키만 심으면 이번 요청의 Server Component는 여전히 토큰이 없어
  // /login으로 튕긴다. request 쿠키까지 덮어써야 15분 만료가 사용자에게
  // 보이지 않는다.
  const proxy = await freshProxy();
  refreshSession.mockResolvedValue({ accessToken: "a2", refreshToken: "r2" });

  const req = makeReq(PAGE_ROUTES.dashboard, { refresh: "r1" });
  await proxy(req);

  expect(req.cookies.get(SESSION_COOKIE)?.value).toBe("a2");
  // 다음 태스크(로그아웃의 BE 세션 폐기)가 이 값을 읽는다. 빠지면 옛 토큰을
  // 제출해 가족 폐기 경로가 열린다.
  expect(req.cookies.get(REFRESH_COOKIE)?.value).toBe("r2");
});

it("갱신 실패 시 두 쿠키를 모두 지운다", async () => {
  // 죽은 리프레시 쿠키를 남기면 매 요청마다 갱신을 시도해 401을 반복한다.
  const proxy = await freshProxy();
  refreshSession.mockRejectedValue(Object.assign(new Error("401"), { status: 401 }));

  const res = await proxy(makeReq(PAGE_ROUTES.dashboard, { refresh: "r-dead" }));

  // toBeFalsy()만 쓰면 "쿠키를 지웠다(value: "")"와 "애초에 건드리지 않았다
  // (undefined)"를 구분하지 못한다. toBeDefined()로 응답에 실제 삭제
  // 지시(Set-Cookie)가 담겼는지까지 확인한다.
  expect(res.cookies.get(SESSION_COOKIE)).toBeDefined();
  expect(res.cookies.get(SESSION_COOKIE)?.value).toBeFalsy();
  expect(res.cookies.get(REFRESH_COOKIE)).toBeDefined();
  expect(res.cookies.get(REFRESH_COOKIE)?.value).toBeFalsy();
});

it("갱신 실패가 401이 아니면(순단·5xx) 쿠키를 지우지 않는다", async () => {
  // BE 배포 중 502처럼 복구 가능한 에러다. 여기서 리프레시 쿠키를 지우면
  // 배포 순간 만료 구간에 있던 사용자 전원이 로그아웃된다.
  const proxy = await freshProxy();
  refreshSession.mockRejectedValue(Object.assign(new Error("500"), { status: 500 }));

  const res = await proxy(makeReq(PAGE_ROUTES.dashboard, { refresh: "r1" }));

  expect(res.cookies.get(SESSION_COOKIE)).toBeUndefined();
  expect(res.cookies.get(REFRESH_COOKIE)).toBeUndefined();
});

it("갱신 실패 시 보호 경로는 로그인으로 보낸다", async () => {
  const proxy = await freshProxy();
  refreshSession.mockRejectedValue(Object.assign(new Error("401"), { status: 401 }));

  const res = await proxy(makeReq(PAGE_ROUTES.dashboard, { refresh: "r-dead" }));

  expect(res.status).toBe(307);
  expect(res.headers.get("location")).toContain(PAGE_ROUTES.login);
});

it("쿠키가 아예 없으면 갱신을 시도하지 않는다", async () => {
  // 비로그인 방문자다. 부를 리프레시 토큰이 없다.
  const proxy = await freshProxy();
  await proxy(makeReq(PAGE_ROUTES.dashboard));
  expect(refreshSession).not.toHaveBeenCalled();
});

it("로그인·가입 경로에서는 갱신하지 않는다", async () => {
  // 인증을 새로 시작하는 경로다. 여기서 갱신이 돌면 로그아웃 직후
  // 남은 쿠키로 세션이 되살아나는 혼란이 생긴다.
  const proxy = await freshProxy();
  await proxy(makeReq(PAGE_ROUTES.login, { refresh: "r1" }));
  expect(refreshSession).not.toHaveBeenCalled();
});

it("세션이 있으면 로그인 페이지에서 대시보드로 보낸다(기존 동작 유지)", async () => {
  const proxy = await freshProxy();
  const res = await proxy(makeReq(PAGE_ROUTES.login, { access: "a1" }));
  expect(res.status).toBe(307);
  expect(res.headers.get("location")).toContain(PAGE_ROUTES.dashboard);
});

it("세션이 없으면 보호 경로에서 로그인으로 보낸다(기존 동작 유지)", async () => {
  const proxy = await freshProxy();
  const res = await proxy(makeReq(PAGE_ROUTES.dashboard));
  expect(res.status).toBe(307);
  expect(res.headers.get("location")).toContain(PAGE_ROUTES.login);
});

it("게시판 경로에서도 갱신이 일어난다", async () => {
  // matcher를 옛 값(/dashboard·/login·/signup)으로 되돌리면 이 테스트가 잡는다.
  const proxy = await freshProxy();
  refreshSession.mockResolvedValue({ accessToken: "a2", refreshToken: "r2" });

  await proxy(makeReq(PAGE_ROUTES.boardHome, { refresh: "r1" }));

  expect(refreshSession).toHaveBeenCalledWith("r1");
});

it("matcher가 앱 경로·내부 API를 잡고 정적 자산은 제외한다", () => {
  const matchedUrls = [
    PAGE_ROUTES.boardHome,
    PAGE_ROUTES.chat,
    PAGE_ROUTES.settings,
    PAGE_ROUTES.notifications,
    API_ROUTES.buildings,
  ];
  for (const url of matchedUrls) {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
  }
  expect(
    unstable_doesMiddlewareMatch({ config, url: "/_next/static/chunks/main.js" }),
  ).toBe(false);
});
