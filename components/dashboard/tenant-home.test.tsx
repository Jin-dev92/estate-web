import { render, screen } from "@testing-library/react";
import { TenantHome } from "@/components/dashboard/tenant-home";
it("ACTIVE 계약이 있으면 '입주 중' 노출", () => {
  render(<TenantHome leases={[{ id: "l1", unitId: "u1", status: "ACTIVE", unitName: null, buildingName: null, buildingId: null }]} notifications={[]} chatRooms={[]} />);
  expect(screen.getByText(/입주 중/)).toBeInTheDocument();
});
