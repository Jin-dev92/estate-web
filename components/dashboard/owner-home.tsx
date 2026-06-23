import { Card } from "@/components/ui/card";
import { StatValue } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/empty-state";
import { ListRow } from "@/components/ui/list-row";
import { RecentActivity } from "./recent-activity";
import { ChatSummary } from "./chat-summary";
import Link from "next/link";
import type { Building, Notification, ChatRoom } from "@/lib/api";
import { PAGE_ROUTES } from "@/lib/constants";

export function OwnerHome({ buildings, notifications, chatRooms }: { buildings: Building[]; notifications: Notification[]; chatRooms: ChatRoom[] }) {
  return (
    <>
      <h1 className="mb-4 text-[22px] font-extrabold tracking-tight">내 건물</h1>
      <Card><StatValue label="보유 건물" value={buildings.length} /></Card>
      <Card className="mt-3 p-0">
        {buildings.length === 0 ? <EmptyState text="등록된 건물이 없어요. 첫 건물을 등록하세요." /> :
          <div className="divide-y divide-border px-4">
            {buildings.map((b) => <ListRow key={b.id} title={b.name} desc={b.address} />)}
          </div>}
      </Card>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Link href={PAGE_ROUTES.buildings} className="rounded-[14px] bg-surface-2 py-3 text-center text-[13px] font-semibold">건물 관리</Link>
        <Link href={PAGE_ROUTES.inviteCodes} className="rounded-[14px] bg-surface-2 py-3 text-center text-[13px] font-semibold">초대코드</Link>
        <Link href={PAGE_ROUTES.boardHome} className="rounded-[14px] bg-surface-2 py-3 text-center text-[13px] font-semibold">게시판</Link>
      </div>
      <RecentActivity items={notifications} />
      <ChatSummary rooms={chatRooms} />
    </>
  );
}
