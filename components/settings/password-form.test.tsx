import { vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PasswordForm } from "@/components/settings/password-form";

afterEach(() => vi.unstubAllGlobals());

function fill() {
  fireEvent.input(screen.getByLabelText("현재 비밀번호"), { target: { value: "current1" } });
  fireEvent.input(screen.getByLabelText("새 비밀번호(8자 이상)"), { target: { value: "newpass12" } });
}

it("성공 시 성공 메시지 표시", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })));
  render(<PasswordForm />);
  fill();
  fireEvent.click(screen.getByText("비밀번호 변경"));
  await waitFor(() => expect(screen.getByText("비밀번호를 변경했어요.")).toBeInTheDocument());
});

it("401이면 현재 비밀번호 불일치 메시지", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ message: "현재 비밀번호가 일치하지 않습니다." }), { status: 401 })));
  render(<PasswordForm />);
  fill();
  fireEvent.click(screen.getByText("비밀번호 변경"));
  await waitFor(() => expect(screen.getByText("현재 비밀번호가 일치하지 않습니다.")).toBeInTheDocument());
});
