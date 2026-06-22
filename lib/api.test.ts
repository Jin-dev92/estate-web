import { vi } from "vitest";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { backendLogin, backendMe, ApiError } from "@/lib/api";

it("401이면 ApiError('이메일 또는 비밀번호를 확인하세요')", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({}), { status: 401 })));
  await expect(backendLogin("a@b.com", "pw")).rejects.toMatchObject({
    status: 401,
    message: "이메일 또는 비밀번호를 확인하세요",
  });
});

it("성공이면 accessToken 반환", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ accessToken: "t" }), { status: 201 })));
  await expect(backendLogin("a@b.com", "pw")).resolves.toEqual({ accessToken: "t" });
});

it("401이면 ApiError 던짐(인증 만료)", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
  await expect(backendMe("badtoken")).rejects.toMatchObject({ status: 401 });
});
