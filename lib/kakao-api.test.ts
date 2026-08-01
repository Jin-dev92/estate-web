import { vi } from "vitest";
import { backendKakaoLogin, backendKakaoComplete } from "@/lib/api";
import { mockFetch, initOf, urlOf } from "@/test/mock-fetch";

afterEach(() => vi.unstubAllGlobals());

it("backendKakaoLogin: POST /auth/kakao body", async () => {
  const fetchMock = mockFetch(201, { onboardingToken: "o" });
  await backendKakaoLogin("c", "r");
  const init = initOf(fetchMock);
  expect(urlOf(fetchMock)).toMatch(/\/auth\/kakao$/);
  expect(init.method).toBe("POST");
  expect(JSON.parse(String(init.body))).toEqual({ code: "c", redirectUri: "r" });
});

it("backendKakaoComplete: POST /auth/kakao/complete body", async () => {
  const fetchMock = mockFetch(201, { accessToken: "a" });
  await backendKakaoComplete("o", "OWNER");
  const init = initOf(fetchMock);
  expect(urlOf(fetchMock)).toMatch(/\/auth\/kakao\/complete$/);
  expect(init.method).toBe("POST");
  expect(JSON.parse(String(init.body))).toEqual({ onboardingToken: "o", role: "OWNER" });
});
