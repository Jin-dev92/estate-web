import "server-only";
import { backendMe, backendMyLeases, backendMyBuildings, backendNotifications, backendUnreadCount, backendMyRooms, type Me, type Lease, type Building, type Notification, type ChatRoom } from "./api";
import { ROLE } from "./constants";

export type DashboardData = {
  me: Me;
  unread: number;
  notifications: Notification[];
  chatRooms: ChatRoom[];
  leases: Lease[];      // TENANT
  buildings: Building[]; // OWNER
};

/** 일부 페치가 실패해도 홈 전체가 깨지지 않도록 개별 try/catch로 degrade */
async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try { return await p; } catch { return fallback; }
}

export async function loadDashboard(token: string): Promise<DashboardData> {
  const me = await backendMe(token); // 실패(401)면 호출부가 /login으로 보냄
  const [unreadRes, notifications, chatRooms, leases, buildings] = await Promise.all([
    safe(backendUnreadCount(token), { count: 0 }),
    safe(backendNotifications(token, 5), [] as Notification[]),
    safe(backendMyRooms(token), [] as ChatRoom[]),
    me.role === ROLE.TENANT ? safe(backendMyLeases(token), [] as Lease[]) : Promise.resolve([] as Lease[]),
    me.role === ROLE.OWNER ? safe(backendMyBuildings(token), [] as Building[]) : Promise.resolve([] as Building[]),
  ]);
  return { me, unread: unreadRes.count, notifications, chatRooms, leases, buildings };
}
