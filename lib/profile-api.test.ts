import { backendProfile, backendUpdateProfile, backendChangePassword } from "@/lib/api";
import { mockFetch, initOf, urlOf } from "@/test/mock-fetch";

it("backendProfile: GET /auth/profile를 Bearer로", async () => {
  const fetchMock = mockFetch(200, { id: "u1", email: "a@b.com", name: "김철수", role: "TENANT" });
  await backendProfile("tok");
  expect(urlOf(fetchMock)).toMatch(/\/auth\/profile$/);
  expect(initOf(fetchMock).headers).toMatchObject({ Authorization: "Bearer tok" });
});

it("backendUpdateProfile: PATCH name", async () => {
  const fetchMock = mockFetch(200);
  await backendUpdateProfile("tok", { name: "이영희" });
  const init = initOf(fetchMock);
  expect(init.method).toBe("PATCH");
  expect(JSON.parse(String(init.body))).toEqual({ name: "이영희" });
});

it("backendChangePassword: PATCH /auth/password body", async () => {
  const fetchMock = mockFetch(200, { ok: true });
  await backendChangePassword("tok", { currentPassword: "a", newPassword: "newpass12" });
  expect(urlOf(fetchMock)).toMatch(/\/auth\/password$/);
  expect(JSON.parse(String(initOf(fetchMock).body))).toEqual({
    currentPassword: "a",
    newPassword: "newpass12",
  });
});
