import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { RecentActivity } from "./recent-activity";
import { ChatSummary } from "./chat-summary";
import Link from "next/link";
import type { Lease, Notification, ChatRoom } from "@/lib/api";
import { PAGE_ROUTES, LEASE_STATUS } from "@/lib/constants";

/**
 * 계약 한 줄에 보일 이름. BE가 이름을 주면 "건물명 호실명"으로 읽히게 쓰고,
 * 없으면 예전처럼 호실 식별자로 폴백한다(BE가 이름을 채우기 전 데이터 대비).
 */
function leaseLabel(lease: Lease): string {
  if (!lease.unitName) return `호실 ${lease.unitId.slice(0, 8)}`;
  return lease.buildingName ? `${lease.buildingName} ${lease.unitName}` : lease.unitName;
}

export function TenantHome({ leases, notifications, chatRooms }: { leases: Lease[]; notifications: Notification[]; chatRooms: ChatRoom[] }) {
  const active = leases.filter((l) => l.status === LEASE_STATUS.ACTIVE);
  return (
    <>
      <h1 className="mb-4 text-[22px] font-extrabold tracking-tight">내 계약</h1>
      <Card>
        {active.length === 0 ? <EmptyState text="활성화된 입주 계약이 없어요. 초대코드로 입주해보세요." /> :
          active.map((l) => (
            <div key={l.id} className="flex items-center justify-between">
              <div className="text-[15px] font-semibold">{leaseLabel(l)}</div>
              <Chip tone="success">입주 중</Chip>
            </div>
          ))}
      </Card>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link href={PAGE_ROUTES.boardHome} className="rounded-[14px] bg-surface-2 py-3 text-center text-[14px] font-semibold">공지·게시판</Link>
        <Link href={PAGE_ROUTES.chat} className="rounded-[14px] bg-surface-2 py-3 text-center text-[14px] font-semibold">1:1 채팅</Link>
      </div>
      <RecentActivity items={notifications} />
      <ChatSummary rooms={chatRooms} />
    </>
  );
}
