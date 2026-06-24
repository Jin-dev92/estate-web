import { authGet, call } from "./client";
import type { NotificationType } from "../constants";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  entityType: string;
  entityId: string;
  buildingId: string | null;
  readAt: string | null;
  createdAt: string;
};

export const backendNotifications = (t: string, limit = 50) =>
  authGet<Notification[]>(`/notifications?limit=${limit}`, t);

export const backendUnreadCount = (t: string) =>
  authGet<{ count: number }>("/notifications/unread-count", t);

export const backendMarkAllRead = (t: string) =>
  call<{ ok: true }>("/notifications/read", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${t}` },
  }, {});

export const backendMarkOneRead = (t: string, id: string) =>
  call<{ ok: true }>(`/notifications/${id}/read`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${t}` },
  }, {});
