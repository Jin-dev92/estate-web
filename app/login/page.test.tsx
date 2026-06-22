import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import LoginPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

it("빈 폼 제출 시 zod 검증 오류 메시지가 표시되고 fetch는 호출되지 않는다", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  render(<LoginPage />);

  fireEvent.click(screen.getByRole("button", { name: "로그인" }));

  await waitFor(() => {
    // zod가 이메일·비밀번호 검증 오류를 하나 이상 표시해야 함
    const errors = screen.getAllByText("이메일 또는 비밀번호를 확인하세요");
    expect(errors.length).toBeGreaterThan(0);
  });

  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});
