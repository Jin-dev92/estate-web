import { vi } from "vitest";
import { backendMarkAllRead, backendMarkOneRead } from "@/lib/api";

it("backendMarkAllRead: PATCH /notifications/read를 Bearer로 호출", async () => {
  const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  await backendMarkAllRead("tok");
  const [url, init] = fetchMock.mock.calls[0];
  expect(String(url)).toMatch(/\/notifications\/read$/);
  expect((init as RequestInit).method).toBe("PATCH");
  expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer tok" });
});

it("backendMarkOneRead: PATCH /notifications/:id/read", async () => {
  const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  await backendMarkOneRead("tok", "n1");
  expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/notifications\/n1\/read$/);
  expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe("PATCH");
});
