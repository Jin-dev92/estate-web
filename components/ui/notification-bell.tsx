"use client";

import Link from "next/link";
import { PAGE_ROUTES } from "@/lib/constants";
import { useNotifications } from "@/components/notifications/notification-provider";

export function NotificationBell() {
  const { unread } = useNotifications();
  return (
    <Link
      href={PAGE_ROUTES.notifications}
      className="relative grid h-10 w-10 place-items-center rounded-xl text-text-2 hover:bg-surface-2"
      aria-label="알림"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M10 20a2 2 0 004 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {unread > 0 && (
        <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-warm px-1 text-[10px] font-bold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
