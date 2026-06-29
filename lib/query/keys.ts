// 쿼리키 단일 출처(매직 문자열 금지). as const로 키 튜플 타입 고정.
export const qk = {
  notifications: {
    list: () => ["notifications", "list"] as const,
    unreadCount: () => ["notifications", "unread-count"] as const,
  },
} as const;
