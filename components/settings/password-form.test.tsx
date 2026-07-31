import { vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

import { PasswordForm } from "@/components/settings/password-form";
import { PAGE_ROUTES } from "@/lib/constants";

afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockReset();
});

function fill() {
  fireEvent.input(screen.getByLabelText("현재 비밀번호"), { target: { value: "current1" } });
  fireEvent.input(screen.getByLabelText("새 비밀번호(8자 이상)"), { target: { value: "newpass12" } });
}

it("성공 시 세션 쿠키를 정리하고 로그인 화면으로 이동", async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  render(<PasswordForm />);
  fill();
  fireEvent.click(screen.getByText("비밀번호 변경"));
  await waitFor(() => expect(replace).toHaveBeenCalledWith(PAGE_ROUTES.login));
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect((fetchMock.mock.calls[1][1] as RequestInit).method).toBe("DELETE");
});

it("401이면 현재 비밀번호 불일치 메시지", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ message: "현재 비밀번호가 일치하지 않습니다." }), { status: 401 })));
  render(<PasswordForm />);
  fill();
  fireEvent.click(screen.getByText("비밀번호 변경"));
  await waitFor(() => expect(screen.getByText("현재 비밀번호가 일치하지 않습니다.")).toBeInTheDocument());
});
