import { afterEach, beforeEach, vi } from "vitest";

// backendRefresh를 목으로 갈아끼운다 — 이 테스트는 네트워크가 아니라
// "BE를 몇 번 부르는가"를 검증한다.
const backendRefresh = vi.fn();
vi.mock("@/lib/api", () => ({ backendRefresh: (t: string) => backendRefresh(t) }));

// 모듈 레벨 맵을 쓰므로 테스트마다 모듈을 새로 불러 상태를 격리한다.
async function freshRefreshSession() {
  vi.resetModules();
  const mod = await import("@/lib/refresh");
  return mod.refreshSession;
}

beforeEach(() => {
  backendRefresh.mockReset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it("동시에 들어온 같은 토큰의 갱신은 BE를 한 번만 부른다", async () => {
  // 회전 정책상 두 번 부르면 두 번째는 소비된 토큰을 제출하게 된다.
  const refreshSession = await freshRefreshSession();
  let resolve!: (v: unknown) => void;
  backendRefresh.mockReturnValue(new Promise((r) => (resolve = r)));

  const a = refreshSession("r1");
  const b = refreshSession("r1");
  const c = refreshSession("r1");
  resolve({ accessToken: "a2", refreshToken: "r2" });

  const results = await Promise.all([a, b, c]);
  expect(backendRefresh).toHaveBeenCalledTimes(1);
  expect(results).toEqual([
    { accessToken: "a2", refreshToken: "r2" },
    { accessToken: "a2", refreshToken: "r2" },
    { accessToken: "a2", refreshToken: "r2" },
  ]);
});

it("갱신이 끝난 뒤 도착한 같은 토큰도 BE를 다시 부르지 않는다", async () => {
  // 여기가 핵심이다. 진행 중 합치기만 하면 이 케이스가 BE를 다시 부르고,
  // BE는 이미 소비된 토큰의 재제출을 침해로 판정해 가족 전체를 폐기한다
  // (estate-server refresh-tokens.use-case.ts:46) = 정상 사용자 강제 로그아웃.
  const refreshSession = await freshRefreshSession();
  backendRefresh.mockResolvedValue({ accessToken: "a2", refreshToken: "r2" });

  const first = await refreshSession("r1");
  const late = await refreshSession("r1"); // 완료 후 도착

  expect(backendRefresh).toHaveBeenCalledTimes(1);
  expect(late).toEqual(first);
});

it("결과 공유는 TTL이 지나면 끝난다", async () => {
  // 무한 캐시면 14일 내내 같은 쌍을 돌려주게 되어 갱신이 멈춘다.
  const refreshSession = await freshRefreshSession();
  backendRefresh.mockResolvedValue({ accessToken: "a2", refreshToken: "r2" });

  await refreshSession("r1");
  await vi.advanceTimersByTimeAsync(60_000);
  await refreshSession("r1");

  expect(backendRefresh).toHaveBeenCalledTimes(2);
});

it("실패는 공유하지 않는다 — 다음 요청이 다시 시도할 수 있다", async () => {
  // 네트워크 순단으로 한 번 실패한 것을 TTL 동안 붙잡아두면
  // 복구 가능한 사용자를 로그인 화면으로 보낸다.
  const refreshSession = await freshRefreshSession();
  backendRefresh.mockRejectedValueOnce(new Error("network"));
  backendRefresh.mockResolvedValueOnce({ accessToken: "a2", refreshToken: "r2" });

  await expect(refreshSession("r1")).rejects.toThrow("network");
  await expect(refreshSession("r1")).resolves.toEqual({ accessToken: "a2", refreshToken: "r2" });
  expect(backendRefresh).toHaveBeenCalledTimes(2);
});

it("다른 토큰의 갱신은 서로 합쳐지지 않는다", async () => {
  // 서로 다른 세션(다른 기기·다른 사용자)이 한 프로세스를 공유한다.
  // 토큰을 키로 쓰지 않으면 A의 갱신 결과가 B에게 새는 심각한 버그가 된다.
  const refreshSession = await freshRefreshSession();
  backendRefresh.mockImplementation((t: string) =>
    Promise.resolve({ accessToken: `a-${t}`, refreshToken: `r-${t}` }),
  );

  const [a, b] = await Promise.all([refreshSession("rA"), refreshSession("rB")]);

  expect(backendRefresh).toHaveBeenCalledTimes(2);
  expect(a).toEqual({ accessToken: "a-rA", refreshToken: "r-rA" });
  expect(b).toEqual({ accessToken: "a-rB", refreshToken: "r-rB" });
});
