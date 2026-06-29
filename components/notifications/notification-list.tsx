"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@/lib/api";
import { API_ROUTES } from "@/lib/constants";
import { qk } from "@/lib/query/keys";
import { notificationHref } from "@/lib/notifications/notification-link";
import { useNotificationsQuery } from "@/lib/query/notifications";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MESSAGES } from "@/lib/messages";

export function NotificationList({ initial }: { initial: Notification[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: items = [] } = useNotificationsQuery(initial);

  const markOne = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(API_ROUTES.notificationRead(id), { method: "PATCH" });
      if (!res.ok) throw new Error(MESSAGES.notification.markFailed);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Notification[]>(qk.notifications.list(), (prev = []) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
      queryClient.setQueryData<number>(qk.notifications.unreadCount(), (c = 0) => Math.max(0, c - 1));
    },
  });

  function open(n: Notification) {
    if (!n.readAt) markOne.mutate(n.id);
    router.push(notificationHref(n));
  }

  if (items.length === 0) return <EmptyState text={MESSAGES.notification.empty} />;

  return (
    <Card className="p-0">
      <div className="divide-y divide-border px-4">
        {items.map((n) => {
          const unread = !n.readAt;
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
