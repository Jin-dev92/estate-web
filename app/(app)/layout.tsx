import { redirect } from "next/navigation";
import Link from "next/link";
import { getToken } from "@/lib/session";
import { backendMe, backendUnreadCount } from "@/lib/api";
import { PAGE_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { NotificationBell } from "@/components/ui/notification-bell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const token = await getToken();
  if (!token) redirect(PAGE_ROUTES.login);

  let initial = "";
  let unread = 0;
  try {
    const me = await backendMe(token);
    initial = me.email.charAt(0).toUpperCase();
  } catch {
    redirect(PAGE_ROUTES.login);
  }
  try {
    unread = (await backendUnreadCount(token)).count;
  } catch {
    unread = 0;
  }

  return (
    <NotificationProvider token={token} initialUnread={unread}>
      <div className="min-h-full">
        <header className="sticky top-0 z-20 border-b border-border bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] backdrop-blur">
          <div className="mx-auto flex max-w-[760px] items-center gap-3 px-5 py-3.5">
            <Link href={PAGE_ROUTES.dashboard} className="flex items-center gap-2 font-extrabold text-[18px]">
              <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-brand-500 text-white">터</span>터전
            </Link>
            <div className="flex-1" />
            <NotificationBell />
            <Link href={PAGE_ROUTES.settings} className="grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-[14px] font-bold text-white" aria-label={MESSAGES.settings.title}>
              {initial}
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-[760px] px-5 pb-16 pt-6">{children}</main>
      </div>
    </NotificationProvider>
  );
}
