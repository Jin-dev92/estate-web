import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

it("variant=primary면 브랜드 배경 클래스", () => {
  render(<Button>로그인</Button>);
  const btn = screen.getByRole("button", { name: "로그인" });
  expect(btn.className).toContain("bg-brand-500");
});
