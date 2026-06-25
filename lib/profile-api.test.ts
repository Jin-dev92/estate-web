import { vi } from "vitest";
import { backendProfile, backendUpdateProfile, backendChangePassword } from "@/lib/api";

it("backendProfile: GET /auth/profile를 Bearer로", async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "u1", email: "a@b.com", name: "김철수", role: "TENANT" }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  await backendProfile("tok");
  expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/auth\/profile$/);
  expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({ Authorization: "Bearer tok" });
});

it("backendUpdateProfile: PATCH name", async () => {
  const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  await backendUpdateProfile("tok", { name: "이영희" });
  const init = fetchMock.mock.calls[0][1] as RequestInit;
  expect(init.method).toBe("PATCH");
  expect(JSON.parse(String(init.body))).toEqual({ name: "이영희" });
});

it("backendChangePassword: PATCH /auth/password body", async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  await backendChangePassword("tok", { currentPassword: "a", newPassword: "newpass12" });
  expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/auth\/password$/);
  expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toEqual({ currentPassword: "a", newPassword: "newpass12" });
});
