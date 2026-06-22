import { redirect } from "next/navigation";
import { getToken } from "@/lib/session";
import { loadDashboard } from "@/lib/dashboard";
import { AppShell } from "@/components/ui/app-shell";
import { TenantHome } from "@/components/dashboard/tenant-home";
import { OwnerHome } from "@/components/dashboard/owner-home";

export default async function DashboardPage() {
  const token = await getToken();
  if (!token) redirect("/login");

  let data;
  try {
    data = await loadDashboard(token);
  } catch {
    // me 실패 = 토큰 무효/만료
    redirect("/login");
  }

  const initial = data.me.email.charAt(0).toUpperCase();
  return (
    <AppShell unread={data.unread} userInitial={initial}>
      {data.me.role === "TENANT" ? (
        <TenantHome leases={data.leases} notifications={data.notifications} chatRooms={data.chatRooms} />
      ) : (
        <OwnerHome buildings={data.buildings} notifications={data.notifications} chatRooms={data.chatRooms} />
      )}
    </AppShell>
  );
}
