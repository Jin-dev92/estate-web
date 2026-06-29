"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@/lib/api";
import { API_ROUTES } from "@/lib/constants";
import { qk } from "@/lib/query/keys";
import { MESSAGES } from "@/lib/messages";

export function MarkAllReadButton() {
  const queryClient = useQueryClient();
  const { mutate, isPending, error } = useMutation({
    mutationFn: async () => {
      const res = await fetch(API_ROUTES.notificationsRead, { method: "PATCH" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message ?? MESSAGES.notification.markFailed);
      }
    },
    onSuccess: () => {
      const now = new Date().toISOString();
      queryClient.setQueryData<Notification[]>(qk.notifications.list(), (prev = []) =>
        prev.map((n) => (n.readAt ? n : { ...n, readAt: now })),
      );
      queryClient.setQueryData<number>(qk.notifications.unreadCount(), 0);
    },
  });

  return (
    <div className="text-right">
      <button onClick={() => mutate()} disabled={isPending} className="text-[13px] font-semibold text-brand-600 disabled:opacity-50">
        {MESSAGES.notification.markAll}
      </button>
      {error && <p className="mt-1 text-[13px] text-danger">{error.message}</p>}
    </div>
  );
}
