import { redirect } from "next/navigation";
import Link from "next/link";
import { getToken } from "@/lib/session";
import { backendMyBuildings } from "@/lib/api";
import { PAGE_ROUTES } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { EmptyState } from "@/components/ui/empty-state";
import { BuildingForm } from "@/components/building/building-form";
import { MESSAGES } from "@/lib/messages";

export default async function BuildingsPage() {
  const token = await getToken();
  if (!token) redirect(PAGE_ROUTES.login);

  let buildings: Awaited<ReturnType<typeof backendMyBuildings>> = [];
  try {
    buildings = await backendMyBuildings(token);
  } catch {
    // 목록 실패 시 빈 상태로 degrade
  }

  return (
    <>
      <h1 className="mb-4 text-[22px] font-extrabold tracking-tight">건물 관리</h1>
      {/* 목록이 먼저다 — 이 화면에 오는 목적은 보유 건물을 보고 고르는 것이다.
          등록 폼을 위에 두면 빈 입력칸이 화면을 차지하고 목록이 아래로 밀린다. */}
      <Card className="p-0">
        {buildings.length === 0 ? (
          <EmptyState text="등록된 건물이 없어요. 첫 건물을 추가하세요." />
        ) : (
          <div className="divide-y divide-border px-4">
            {buildings.map((b) => (
              <Link
                key={b.id}
                href={PAGE_ROUTES.buildingDetail(b.id)}
                className="block hover:bg-surface-2"
              >
                <ListRow title={b.name} desc={b.address} />
              </Link>
            ))}
          </div>
        )}
      </Card>
      <section className="mt-6">
        <h2 className="mb-3 text-[16px] font-bold text-text">{MESSAGES.building.newBuilding}</h2>
        <BuildingForm />
      </section>
    </>
  );
}
