import { redirect } from "next/navigation";
import { getToken } from "@/lib/session";
import { backendNotifications, type Notification } from "@/lib/api";
import { NotificationList } from "@/components/notifications/notification-list";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { PAGE_ROUTES } from "@/lib/constants";

export default async function NotificationsPage() {
  const token = await getToken();
  if (!token) redirect(PAGE_ROUTES.login);

  let items: Notification[];
  try {
    items = await backendNotifications(token, 50);
  } catch {
    items = [];
  }

  return (
    <>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-[22px] font-extrabold tracking-tight">알림</h1>
        <MarkAllReadButton />
      </div>
      <NotificationList initial={items} />
    </>
  );
}
