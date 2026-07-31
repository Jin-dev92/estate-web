import { beforeEach, vi } from "vitest";

const backendLogout = vi.fn();
const clearSession = vi.fn();
const getRefreshToken = vi.fn();

vi.mock("@/lib/api", () => ({
  backendLogout: (t: string) => backendLogout(t),
  ApiError: class ApiError extends Error { status = 500; },
}));
vi.mock("@/lib/session", () => ({
  clearSession: () => clearSession(),
  getRefreshToken: () => getRefreshToken(),
  setSessionPair: vi.fn(),
}));

async function freshDelete() {
  vi.resetModules();
  const mod = await import("@/app/api/session/route");
  return mod.DELETE;
}

beforeEach(() => {
  backendLogout.mockReset();
  clearSession.mockReset();
  getRefreshToken.mockReset();
});

it("로그아웃은 서버 세션을 폐기하고 쿠키를 지운다", async () => {
  // 쿠키만 지우면 리프레시 토큰이 14일간 서버에 살아있다.
  const DELETE = await freshDelete();
  getRefreshToken.mockResolvedValue("r1");
  backendLogout.mockResolvedValue({});

  const res = await DELETE();

  expect(backendLogout).toHaveBeenCalledWith("r1");
  expect(clearSession).toHaveBeenCalled();
  expect(res.status).toBe(200);
});

it("BE 폐기가 실패해도 쿠키는 지운다", async () => {
  // 여기서 쿠키를 남기면 사용자는 로그아웃 버튼을 눌렀는데도 로그인 상태로
  // 남는다. 서버 세션 폐기 실패보다 이게 더 나쁜 결과다.
  const DELETE = await freshDelete();
  getRefreshToken.mockResolvedValue("r1");
  backendLogout.mockRejectedValue(new Error("network"));

  const res = await DELETE();

  expect(clearSession).toHaveBeenCalled();
  expect(res.status).toBe(200);
});

it("리프레시 쿠키가 없으면 BE를 부르지 않고 쿠키만 지운다", async () => {
  const DELETE = await freshDelete();
  getRefreshToken.mockResolvedValue(null);

  const res = await DELETE();

  expect(backendLogout).not.toHaveBeenCalled();
  expect(clearSession).toHaveBeenCalled();
  expect(res.status).toBe(200);
});
