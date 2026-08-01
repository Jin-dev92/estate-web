import { vi } from "vitest";

/**
 * 전역 fetch를 목으로 교체한다.
 *
 * `vi.fn(async () => ...)`처럼 파라미터 없는 구현만 주면 `mock.calls`가 빈 튜플 `[]`로
 * 추론돼 `calls[0][1]`(init) 접근이 타입에러가 난다. `vi.fn<typeof fetch>()`로 시그니처를
 * 묶어 `calls[0]`이 `[input, init?]`로 추론되게 한다.
 */
export function mockFetch(status = 200, json: unknown = {}) {
  const fn = vi.fn<typeof fetch>(
    async () => new Response(JSON.stringify(json), { status }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

export type FetchMock = ReturnType<typeof mockFetch>;

/**
 * 목 fetch가 `callIndex`번째 호출에서 받은 `RequestInit`.
 *
 * `calls[i][1]`은 타입상 optional이라 소비처마다 `as RequestInit` 캐스팅이 반복됐다.
 * 여기서 한 번만 좁히고, 없으면 캐스팅으로 덮지 않고 즉시 실패시킨다 —
 * init이 없다는 건 테스트가 검증하려던 호출이 애초에 일어나지 않았다는 뜻이다.
 */
export function initOf(fn: FetchMock, callIndex = 0): RequestInit {
  const call = fn.mock.calls[callIndex];
  if (!call) throw new Error(`fetch 호출 #${callIndex}가 없습니다 (총 ${fn.mock.calls.length}회)`);
  const init = call[1];
  if (!init) throw new Error(`fetch 호출 #${callIndex}에 RequestInit이 없습니다`);
  return init;
}

/** 목 fetch가 `callIndex`번째 호출에서 받은 URL(문자열). */
export function urlOf(fn: FetchMock, callIndex = 0): string {
  const call = fn.mock.calls[callIndex];
  if (!call) throw new Error(`fetch 호출 #${callIndex}가 없습니다 (총 ${fn.mock.calls.length}회)`);
  return String(call[0]);
}

/** `RequestInit.headers`를 조회 가능한 형태로 좁힌다(대부분의 목이 plain 객체로 넘긴다). */
export function headersOf(init: RequestInit): Record<string, string> {
  return (init.headers ?? {}) as Record<string, string>;
}
