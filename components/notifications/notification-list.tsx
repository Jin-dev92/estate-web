"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Notification } from "@/lib/api";
import { API_ROUTES } from "@/lib/constants";
import { notificationHref } from "@/lib/notifications/notification-link";
import { useNotifications } from "@/components/notifications/notification-provider";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MESSAGES } from "@/lib/messages";

export function NotificationList({ initial }: { initial: Notification[] }) {
  const router = useRouter();
  const { liveItems, decrement } = useNotifications();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // 실시간 수신분(미읽음)을 상단에 합치고 id 중복 제거.
  const seen = new Set<string>();
  const merged = [...liveItems, ...initial].filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });

  async function open(n: Notification) {
    const wasUnread = !n.readAt && !readIds.has(n.id);
    if (wasUnread) {
      setReadIds((prev) => new Set(prev).add(n.id));
      const res = await fetch(API_ROUTES.notificationRead(n.id), { method: "PATCH" });
      if (res.ok) {
        decrement();
      } else {
        setReadIds((prev) => {
          const next = new Set(prev);
          next.delete(n.id);
          return next;
        });
      }
    }
    router.push(notificationHref(n));
  }

  if (merged.length === 0) return <EmptyState text={MESSAGES.notification.empty} />;

  return (
    <Card className="p-0">
      <div className="divide-y divide-border px-4">
        {merged.map((n) => {
          const unread = !n.readAt && !readIds.has(n.id);
          return (
            <button key={n.id} onClick={() => open(n)} className="flex w-full items-start gap-3 py-3.5 text-left hover:bg-surface-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-text">{n.title}</span>
                  {unread && <span className="h-1.5 w-1.5 rounded-full bg-warm" />}
                </div>
                {n.body && <div className="mt-0.5 truncate text-[13px] text-text-2">{n.body}</div>}
              </div>
              <span className="shrink-0 text-[12px] text-text-3">{new Date(n.createdAt).toLocaleDateString("ko-KR")}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
