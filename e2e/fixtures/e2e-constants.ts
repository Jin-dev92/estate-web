// E2E 계약 상수 — 목 BE와 테스트가 공유하는 결합 식별자(단일 출처).
export const E2E_CREDENTIALS = {
  tenantEmail: "tenant@e2e.test",
  password: "password123",
  // 목 BE가 이 이메일이면 401을 반환한다(로그인 실패 경로 트리거).
  failEmail: "fail@e2e.test",
  // 설정 페이지 프로필 표시 이름(렌더·이름 필드 프리필 검증용).
  tenantName: "김입주",
} as const;

// 목 BE가 발급하고 인증 픽스처가 쿠키에 주입하는 세션 토큰(값은 임의 — 목 /auth/me가 무조건 응답).
// server.ts(발급)와 fixtures/auth.ts(주입) 두 곳이 공유하므로 단일 출처로 둔다.
export const E2E_SESSION_TOKEN = "e2e-token";

// 게시판 E2E 결합 상수(목 BE와 테스트가 공유).
export const E2E_BOARD = {
  buildingId: "b-e2e",
  postId: "p-e2e",
  postTitle: "E2E 공지 제목",
  postBody: "E2E 본문 내용입니다.",
} as const;
