import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { RecentActivity } from "./recent-activity";
import { ChatSummary } from "./chat-summary";
import Link from "next/link";
import type { Lease, Notification, ChatRoom } from "@/lib/api";
import { PAGE_ROUTES, LEASE_STATUS } from "@/lib/constants";

export function TenantHome({ leases, notifications, chatRooms }: { leases: Lease[]; notifications: Notification[]; chatRooms: ChatRoom[] }) {
  const active = leases.filter((l) => l.status === LEASE_STATUS.ACTIVE);
  return (
    <>
      <h1 className="mb-4 text-[22px] font-extrabold tracking-tight">내 계약</h1>
      <Card>
        {active.length === 0 ? <EmptyState text="활성화된 입주 계약이 없어요. 초대코드로 입주해보세요." /> :
          active.map((l) => (
            <div key={l.id} className="flex items-center justify-between">
              {/* 이름 보강 전: 호실 식별자 표시(선행 보강 시 buildingName/unitName으로 교체) */}
              <div className="text-[15px] font-semibold">호실 {l.unitId.slice(0, 8)}</div>
              <Chip tone="success">입주 중</Chip>
            </div>
          ))}
      </Card>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link href={PAGE_ROUTES.board} className="rounded-[14px] bg-surface-2 py-3 text-center text-[14px] font-semibold">공지·게시판</Link>
        <Link href={PAGE_ROUTES.chat} className="rounded-[14px] bg-surface-2 py-3 text-center text-[14px] font-semibold">1:1 채팅</Link>
      </div>
      <RecentActivity items={notifications} />
      <ChatSummary rooms={chatRooms} />
    </>
  );
}
