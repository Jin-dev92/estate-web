"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { useNotifications } from "@/components/notifications/notification-provider";

export function MarkAllReadButton() {
  const router = useRouter();
  const { reset } = useNotifications();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function markAll() {
    setLoading(true);
    setError(null);
    const res = await fetch(API_ROUTES.notificationsRead, { method: "PATCH" });
    if (res.ok) {
      reset();
      router.refresh();
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.message ?? MESSAGES.notification.markFailed);
    }
    setLoading(false);
  }

  return (
    <div className="text-right">
      <button onClick={markAll} disabled={loading} className="text-[13px] font-semibold text-brand-600 disabled:opacity-50">
        {MESSAGES.notification.markAll}
      </button>
      {error && <p className="mt-1 text-[13px] text-danger">{error}</p>}
    </div>
  );
}
