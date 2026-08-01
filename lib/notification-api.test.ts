import { backendMarkAllRead, backendMarkOneRead } from "@/lib/api";
import { mockFetch, initOf, urlOf } from "@/test/mock-fetch";

it("backendMarkAllRead: PATCH /notifications/read를 Bearer로 호출", async () => {
  const fetchMock = mockFetch(200);
  await backendMarkAllRead("tok");
  const init = initOf(fetchMock);
  expect(urlOf(fetchMock)).toMatch(/\/notifications\/read$/);
  expect(init.method).toBe("PATCH");
  expect(init.headers).toMatchObject({ Authorization: "Bearer tok" });
});

it("backendMarkOneRead: PATCH /notifications/:id/read", async () => {
  const fetchMock = mockFetch(200);
  await backendMarkOneRead("tok", "n1");
  expect(urlOf(fetchMock)).toMatch(/\/notifications\/n1\/read$/);
  expect(initOf(fetchMock).method).toBe("PATCH");
});
