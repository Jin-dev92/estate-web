import { redirect } from "next/navigation";
import { getToken } from "@/lib/session";
import { backendBuildingUnits } from "@/lib/api";
import { PAGE_ROUTES } from "@/lib/constants";
import { AppShell } from "@/components/ui/app-shell";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { EmptyState } from "@/components/ui/empty-state";
import { UnitForm } from "@/components/building/unit-form";
import { InviteCodeCard } from "@/components/building/invite-code-card";

export default async function BuildingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = await getToken();
  if (!token) redirect(PAGE_ROUTES.login);

  let units: Awaited<ReturnType<typeof backendBuildingUnits>> = [];
  try {
    units = await backendBuildingUnits(token, id);
  } catch {
    // 백엔드 미구현 시 빈 배열로 degrade
  }

  return (
    <AppShell unread={0} userInitial="">
      <h1 className="mb-4 text-[22px] font-extrabold tracking-tight">호실 관리</h1>
      <UnitForm buildingId={id} />
      <Card className="p-0">
        {units.length === 0 ? (
          <EmptyState text="등록된 호실이 없어요. 첫 호실을 추가하세요." />
        ) : (
          <div className="divide-y divide-border px-4">
            {units.map((u) => (
              <div key={u.id}>
                <ListRow title={u.name} desc={`${u.floor}층`} />
                <InviteCodeCard unitId={u.id} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
