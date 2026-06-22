import { authGet } from "./client";

export type Notification = { id: string; type: string; payload: Record<string, unknown>; readAt: string | null; createdAt?: string };

export const backendNotifications = (t: string, limit = 5) => authGet<Notification[]>(`/notifications?limit=${limit}`, t);
export const backendUnreadCount = (t: string) => authGet<{ count: number }>("/notifications/unread-count", t);
