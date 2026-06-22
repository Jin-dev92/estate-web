import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import type { ChatRoom } from "@/lib/api";

export function ChatSummary({ rooms }: { rooms: ChatRoom[] }) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-baseline justify-between px-0.5">
        <h2 className="text-[16px] font-bold">채팅</h2>
        <Link href="/chat" className="text-[13px] text-text-3">모두 보기</Link>
      </div>
      <Card>
        {rooms.length === 0 ? <EmptyState text="진행 중인 대화가 없어요." />
          : <div className="text-[14px] text-text">진행 중인 대화 {rooms.length}개</div>}
      </Card>
    </section>
  );
}
