import { vi } from "vitest";
import { post, authPost, authPatch } from "./client";

function mockFetch(status = 200, json: unknown = {}) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(json), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

it("post: 비인증 POST로 body를 직렬화하고 Authorization 헤더가 없다", async () => {
  const fetchMock = mockFetch(200);
  await post("/x", { a: 1 });
  const init = fetchMock.mock.calls[0][1] as RequestInit;
  expect(init.method).toBe("POST");
  expect(JSON.parse(String(init.body))).toEqual({ a: 1 });
  expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
});

it("authPost(body 有): Bearer 헤더 + 직렬화된 body를 보낸다", async () => {
  const fetchMock = mockFetch(201);
  await authPost("/x", "tok", { a: 1 });
  const init = fetchMock.mock.calls[0][1] as RequestInit;
  expect(init.method).toBe("POST");
  expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  expect(JSON.parse(String(init.body))).toEqual({ a: 1 });
});

it("authPost(body 無): init에 body 키가 없다", async () => {
  const fetchMock = mockFetch(200);
  await authPost("/x", "tok");
  const init = fetchMock.mock.calls[0][1] as RequestInit;
  expect("body" in init).toBe(false);
});

it("authPatch(body 無): PATCH·Bearer·body 키 없음", async () => {
  const fetchMock = mockFetch(200);
  await authPatch("/x", "tok");
  const init = fetchMock.mock.calls[0][1] as RequestInit;
  expect(init.method).toBe("PATCH");
  expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  expect("body" in init).toBe(false);
});

it("errorMap 매칭 시 해당 메시지로 ApiError를 던진다", async () => {
  mockFetch(404);
  await expect(authPost("/x", "tok", { a: 1 }, { 404: "없음" })).rejects.toMatchObject({
    status: 404,
    message: "없음",
  });
});
