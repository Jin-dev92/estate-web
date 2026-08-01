import { render, screen } from "@testing-library/react";
import { TenantHome } from "@/components/dashboard/tenant-home";
import { LEASE_STATUS } from "@/lib/constants";
import type { Lease } from "@/lib/api";

function lease(over: Partial<Lease> = {}): Lease {
  return {
    id: "l1",
    unitId: "u1",
    status: LEASE_STATUS.ACTIVE,
    unitName: null,
    buildingName: null,
    buildingId: null,
    ...over,
  };
}

it("ACTIVE 계약이 있으면 '입주 중' 노출", () => {
  render(<TenantHome leases={[lease()]} notifications={[]} chatRooms={[]} />);
  expect(screen.getByText(/입주 중/)).toBeInTheDocument();
});

it("건물명·호실명이 오면 식별자 대신 이름을 보여준다", () => {
  render(
    <TenantHome
      leases={[lease({ unitName: "201호", buildingName: "터전오너빌딩" })]}
      notifications={[]}
      chatRooms={[]}
    />,
  );
  expect(screen.getByText("터전오너빌딩 201호")).toBeInTheDocument();
});

it("호실명만 오면 호실명만 보여준다", () => {
  render(<TenantHome leases={[lease({ unitName: "201호" })]} notifications={[]} chatRooms={[]} />);
  expect(screen.getByText("201호")).toBeInTheDocument();
});

it("이름이 없으면 호실 식별자로 폴백한다", () => {
  // BE가 이름을 채우기 전 데이터. 빈 화면 대신 식별자라도 보여준다.
  render(<TenantHome leases={[lease({ unitId: "unit-owner-e2e" })]} notifications={[]} chatRooms={[]} />);
  expect(screen.getByText("호실 unit-own")).toBeInTheDocument();
});
