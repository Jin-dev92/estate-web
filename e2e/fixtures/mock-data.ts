import type { Me, Profile, Post, PostDetail, Comment, Notification } from "../../lib/api";
import { ROLE, POST_CATEGORY, NOTIFICATION_TYPE } from "../../lib/constants";
import { E2E_CREDENTIALS, E2E_BOARD, E2E_NOTIFICATION } from "./e2e-constants";

// 목 응답을 lib/api 도메인 타입에 묶는다 — 계약(타입) 변경 시 여기서 타입에러가 나
// CI typecheck가 실패하므로 E2E false-green(drift)을 방지한다.
export function mockMe(): Me {
  return { id: "u-e2e", email: E2E_CREDENTIALS.tenantEmail, role: ROLE.TENANT };
}

export function mockProfile(): Profile {
  return {
    id: "u-e2e",
    email: E2E_CREDENTIALS.tenantEmail,
    name: E2E_CREDENTIALS.tenantName,
    role: ROLE.TENANT,
  };
}

export function mockPost(): Post {
  return {
    id: E2E_BOARD.postId,
    category: POST_CATEGORY.FREE,
    title: E2E_BOARD.postTitle,
    authorId: "u-e2e",
    createdAt: "2026-07-01T00:00:00.000Z",
  };
}

export function mockPostDetail(): PostDetail {
  return { ...mockPost(), content: E2E_BOARD.postBody, comments: [] };
}

export function mockCreatedPost(): Post {
  return { id: "p-new-e2e", category: POST_CATEGORY.FREE, title: E2E_BOARD.postTitle, authorId: "u-e2e" };
}

export function mockCreatedComment(): Comment {
  return { id: "c-new-e2e", authorId: "u-e2e", content: "e2e-comment" };
}

// 알림 센터 목록 — 미읽음(PostAdded) + 읽음(CommentAdded) 두 건.
// 미읽음은 게시판 결합키를 물려 클릭 시 딥링크가 /board/:b/:p 로 향한다.
export function mockNotifications(): Notification[] {
  return [
    {
      id: E2E_NOTIFICATION.unreadId,
      type: NOTIFICATION_TYPE.PostAdded,
      title: E2E_NOTIFICATION.unreadTitle,
      body: E2E_NOTIFICATION.unreadBody,
      entityType: "post",
      entityId: E2E_BOARD.postId,
      buildingId: E2E_BOARD.buildingId,
      readAt: null,
      createdAt: "2026-07-01T00:00:00.000Z",
    },
    {
      id: E2E_NOTIFICATION.readId,
      type: NOTIFICATION_TYPE.CommentAdded,
      title: E2E_NOTIFICATION.readTitle,
      body: E2E_NOTIFICATION.readBody,
      entityType: "comment",
      entityId: E2E_BOARD.postId,
      buildingId: E2E_BOARD.buildingId,
      readAt: "2026-07-01T00:00:00.000Z",
      createdAt: "2026-07-01T00:00:00.000Z",
    },
  ];
}

// 미읽음 개수 — mockNotifications()의 readAt=null 건수와 일치시킨다.
export function mockUnreadCount(): { count: number } {
  return { count: mockNotifications().filter((n) => n.readAt === null).length };
}
