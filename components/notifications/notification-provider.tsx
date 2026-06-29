"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import type { Notification } from "@/lib/api";
import { WS_URL } from "@/lib/chat/ws";
import { qk } from "@/lib/query/keys";

// 소켓 수신 알림을 react-query 캐시(list/unreadCount)에 직접 쓴다. 별도 context state 없음.
export function NotificationProvider({
  token,
  children,
}: {
  token: string;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(`${WS_URL}/notifications`, {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = socket;
    socket.on("notification", (n: Notification) => {
      queryClient.setQueryData<Notification[]>(qk.notifications.list(), (prev = []) =>
        prev.some((x) => x.id === n.id) ? prev : [n, ...prev],
      );
      queryClient.setQueryData<number>(qk.notifications.unreadCount(), (c = 0) => c + 1);
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, queryClient]);

  return <>{children}</>;
}
