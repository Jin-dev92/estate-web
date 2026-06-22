import { render, screen } from "@testing-library/react";
import { OwnerHome } from "@/components/dashboard/owner-home";
it("건물 수를 StatValue로 노출", () => {
  render(<OwnerHome buildings={[{ id: "b1", name: "래미안", address: "서울" }]} notifications={[]} chatRooms={[]} />);
  expect(screen.getByText("1")).toBeInTheDocument();
});
