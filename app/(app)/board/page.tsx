import { redirect } from "next/navigation";
import Link from "next/link";
import { getToken } from "@/lib/session";
import { backendMe, backendMyLeases, backendMyBuildings, type Lease, type Building } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { PAGE_ROUTES, ROLE, LEASE_STATUS } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

export default async function BoardEntryPage() {
  const token = await getToken();
  if (!token) redirect(PAGE_ROUTES.login);

  let me;
  try {
    me = await backendMe(token);
  } catch {
    redirect(PAGE_ROUTES.login);
  }

  if (me.role === ROLE.TENANT) {
    let leases: Lease[];
    try {
      leases = await backendMyLeases(token);
    } catch {
      leases = [];
    }
    const active = leases.find((l) => l.status === LEASE_STATUS.ACTIVE && l.buildingId);
    if (active?.buildingId) {
      redirect(PAGE_ROUTES.board(active.buildingId));
    }
    return (
      <>
        <EmptyState text={MESSAGES.board.noBuildingTenant} />
      </>
    );
  }

  // OWNER
  let buildings: Building[];
  try {
    buildings = await backendMyBuildings(token);
  } catch {
    buildings = [];
  }

  if (buildings.length === 0) {
    return (
      <>
        <EmptyState text={MESSAGES.board.noBuildingOwner} />
      </>
    );
  }

  if (buildings.length === 1) {
    redirect(PAGE_ROUTES.board(buildings[0].id));
  }

  return (
    <>
      <h1 className="mb-4 text-[22px] font-extrabold tracking-tight">건물 선택</h1>
      <Card className="p-0">
        <div className="divide-y divide-border px-4">
          {buildings.map((b) => (
            <Link key={b.id} href={PAGE_ROUTES.board(b.id)} className="block hover:bg-surface-2">
              <ListRow title={b.name} desc={b.address} />
            </Link>
          ))}
        </div>
      </Card>
    </>
  );
}
