"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { Notification } from "@/lib/api";
import { WS_URL } from "@/lib/chat/ws";

type Ctx = {
  unread: number;
  liveItems: Notification[];
  decrement: () => void;
  reset: () => void;
};

const NotificationContext = createContext<Ctx | null>(null);

export function useNotifications(): Ctx {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}

export function NotificationProvider({
  token,
  initialUnread,
  children,
}: {
  token: string;
  initialUnread: number;
  children: React.ReactNode;
}) {
  const [unread, setUnread] = useState(initialUnread);
  const [liveItems, setLiveItems] = useState<Notification[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(`${WS_URL}/notifications`, {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = socket;
    socket.on("notification", (n: Notification) => {
      setUnread((u) => u + 1);
      setLiveItems((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev]));
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const decrement = () => setUnread((u) => Math.max(0, u - 1));
  const reset = () => setUnread(0);

  return (
    <NotificationContext.Provider value={{ unread, liveItems, decrement, reset }}>
      {children}
    </NotificationContext.Provider>
  );
}
