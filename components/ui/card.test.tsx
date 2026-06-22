import { render, screen } from "@testing-library/react";
import { Card } from "@/components/ui/card";
it("children을 surface 카드로 렌더", () => {
  render(<Card>내용</Card>);
  expect(screen.getByText("내용").closest("div")?.className).toContain("rounded-");
});
