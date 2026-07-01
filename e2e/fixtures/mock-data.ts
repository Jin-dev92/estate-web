import type { Me, Profile, Post, PostDetail, Comment } from "../../lib/api";
import { ROLE, POST_CATEGORY } from "../../lib/constants";
import { E2E_CREDENTIALS, E2E_BOARD } from "./e2e-constants";

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
