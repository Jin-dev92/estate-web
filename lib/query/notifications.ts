"use client";

import { useQuery } from "@tanstack/react-query";
import type { Notification } from "@/lib/api";
import { qk } from "@/lib/query/keys";

// 캐시는 서버가 준 initialData로만 시드되고, 소켓·뮤테이션이 setQueryData로 갱신한다.
// queryFn 없음 + staleTime Infinity → 클라가 백엔드를 직접 refetch하지 않는다(토큰 비노출).
export function useNotificationsQuery(initial: Notification[]) {
  return useQuery({
    queryKey: qk.notifications.list(),
    queryFn: () => Promise.resolve(initial),
    initialData: initial,
    staleTime: Infinity,
  });
}

export function useUnreadCountQuery(initial: number) {
  return useQuery({
    queryKey: qk.notifications.unreadCount(),
    queryFn: () => Promise.resolve(initial),
    initialData: initial,
    staleTime: Infinity,
  });
}
