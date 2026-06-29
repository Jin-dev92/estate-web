"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@/lib/api";
import { qk } from "@/lib/query/keys";

// 캐시는 서버가 준 initialData로만 시드되고, 소켓·뮤테이션이 setQueryData로 갱신한다.
// queryFn은 현재 캐시를 반환하도록 하여, 우발적 refetch 시 mount-time seed로 회귀하지 않도록 함.
// (소켓·뮤테이션이 setQueryData로 갱신한 값 보존) — 이 키는 invalidate하지 말 것.
// staleTime Infinity로 실질적 refetch가 없어 클라가 백엔드를 직접 호출하지 않는다(토큰 비노출).
export function useNotificationsQuery(initial: Notification[]) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: qk.notifications.list(),
    queryFn: () => queryClient.getQueryData<Notification[]>(qk.notifications.list()) ?? initial,
    initialData: initial,
    staleTime: Infinity,
  });
}

export function useUnreadCountQuery(initial: number) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: qk.notifications.unreadCount(),
    queryFn: () => queryClient.getQueryData<number>(qk.notifications.unreadCount()) ?? initial,
    initialData: initial,
    staleTime: Infinity,
  });
}
