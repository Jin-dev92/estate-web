import { redirect } from "next/navigation";
import Link from "next/link";
import { getToken } from "@/lib/session";
import { backendBuildingUnits, backendMyBuildings } from "@/lib/api";
import { PAGE_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
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

  // 어느 건물의 호실인지 제목에 보여준다. 단건 조회 API가 없어 보유 목록에서 찾는다.
  let buildingName = "";
  try {
    buildingName = (await backendMyBuildings(token)).find((b) => b.id === id)?.name ?? "";
  } catch {
    // 이름을 못 얻어도 호실 관리는 계속 쓸 수 있다.
  }

  return (
    <>
      <div className="mb-4">
        <Link
          href={PAGE_ROUTES.buildings}
          className="inline-flex items-center gap-1 text-[13px] text-text-2 hover:text-text"
        >
          <span aria-hidden="true">←</span> {MESSAGES.building.backToList}
        </Link>
        <h1 className="mt-1 text-[22px] font-extrabold tracking-tight">
          {buildingName ? `${buildingName} 호실 관리` : "호실 관리"}
        </h1>
      </div>
      {/* 목록이 먼저다 — 등록 폼을 위에 두면 기존 호실이 스크롤 아래로 밀린다. */}
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
      <section className="mt-6">
        <h2 className="mb-3 text-[16px] font-bold text-text">{MESSAGES.unit.newUnit}</h2>
        <UnitForm buildingId={id} />
      </section>
    </>
  );
}
