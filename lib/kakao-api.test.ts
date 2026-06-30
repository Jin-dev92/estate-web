import { vi } from "vitest";
import { backendKakaoLogin, backendKakaoComplete } from "@/lib/api";

afterEach(() => vi.unstubAllGlobals());

it("backendKakaoLogin: POST /auth/kakao body", async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ onboardingToken: "o" }), { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
  await backendKakaoLogin("c", "r");
  expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/auth\/kakao$/);
  expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe("POST");
  expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toEqual({ code: "c", redirectUri: "r" });
});

it("backendKakaoComplete: POST /auth/kakao/complete body", async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ accessToken: "a" }), { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
  await backendKakaoComplete("o", "OWNER");
  expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/auth\/kakao\/complete$/);
  expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe("POST");
  expect(JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body))).toEqual({ onboardingToken: "o", role: "OWNER" });
});
