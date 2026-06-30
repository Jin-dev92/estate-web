import { vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { KAKAO_ONBOARDING_KEY } from "@/lib/constants";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

import { RoleSelectForm } from "@/components/auth/role-select-form";

beforeEach(() => {
  replace.mockReset();
  sessionStorage.setItem(KAKAO_ONBOARDING_KEY, "tok");
});
afterEach(() => vi.unstubAllGlobals());

it("역할 선택 성공 시 대시보드로 이동", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })));
  render(<RoleSelectForm />);
  fireEvent.click(screen.getByText("건물주"));
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
});

it("실패 시 에러 메시지 표시", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ message: "가입 세션이 만료되었어요. 다시 시도해주세요." }), { status: 401 })));
  render(<RoleSelectForm />);
  fireEvent.click(screen.getByText("입주자"));
  await waitFor(() => expect(screen.getByText("가입 세션이 만료되었어요. 다시 시도해주세요.")).toBeInTheDocument());
});
