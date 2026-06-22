import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { EmptyState } from "@/components/ui/empty-state";
import type { Notification } from "@/lib/api";

const LABEL: Record<string, string> = {
  MessageSent: "새 메시지", PostCreated: "새 게시글", CommentCreated: "새 댓글", TenantJoined: "새 입주",
};
export function RecentActivity({ items }: { items: Notification[] }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 px-0.5 text-[16px] font-bold">최근 소식</h2>
      <Card className="p-0">
        {items.length === 0 ? <EmptyState text="아직 새 소식이 없어요." /> :
          <div className="divide-y divide-border px-4">
            {items.map((n) => (
              <ListRow key={n.id} title={LABEL[n.type] ?? n.type}
                desc={typeof n.payload?.preview === "string" ? n.payload.preview : undefined}
                meta={n.readAt ? undefined : "NEW"} />
            ))}
          </div>}
      </Card>
    </section>
  );
}
