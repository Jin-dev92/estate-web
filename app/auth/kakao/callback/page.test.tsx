import { vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { KAKAO_STATE_KEY, KAKAO_ONBOARDING_KEY, PAGE_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

const replace = vi.fn();
const mockGet = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => ({ get: mockGet }),
}));

import KakaoCallbackPage from "./page";

beforeEach(() => {
  replace.mockReset();
  mockGet.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

it("state 불일치 → 에러 표시, fetch 미호출", async () => {
  sessionStorage.setItem(KAKAO_STATE_KEY, "correct-state");
  mockGet.mockImplementation((key: string) => {
    if (key === "code") return "test-code";
    if (key === "state") return "wrong-state";
    return null;
  });
  const fetchSpy = vi.spyOn(globalThis, "fetch");

  render(<KakaoCallbackPage />);

  await waitFor(() =>
    expect(screen.getByText(MESSAGES.auth.kakaoFailed)).toBeInTheDocument()
  );
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});

it("next=dashboard → replace(/dashboard) 호출", async () => {
  sessionStorage.setItem(KAKAO_STATE_KEY, "valid-state");
  mockGet.mockImplementation((key: string) => {
    if (key === "code") return "test-code";
    if (key === "state") return "valid-state";
    return null;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify({ next: "dashboard" }), { status: 200 })
    )
  );

  render(<KakaoCallbackPage />);

  await waitFor(() =>
    expect(replace).toHaveBeenCalledWith(PAGE_ROUTES.dashboard)
  );
});

it("next=role-select → onboardingToken 저장 + replace(roleSelect) 호출", async () => {
  sessionStorage.setItem(KAKAO_STATE_KEY, "valid-state");
  mockGet.mockImplementation((key: string) => {
    if (key === "code") return "test-code";
    if (key === "state") return "valid-state";
    return null;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({ next: "role-select", onboardingToken: "ob" }),
        { status: 200 }
      )
    )
  );

  render(<KakaoCallbackPage />);

  await waitFor(() =>
    expect(replace).toHaveBeenCalledWith(PAGE_ROUTES.roleSelect)
  );
  expect(sessionStorage.getItem(KAKAO_ONBOARDING_KEY)).toBe("ob");
});
