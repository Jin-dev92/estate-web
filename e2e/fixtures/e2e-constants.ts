// E2E 계약 상수 — 목 BE와 테스트가 공유하는 결합 식별자(단일 출처).
export const E2E_CREDENTIALS = {
  tenantEmail: "tenant@e2e.test",
  password: "password123",
  // 목 BE가 이 이메일이면 401을 반환한다(로그인 실패 경로 트리거).
  failEmail: "fail@e2e.test",
} as const;

// 목 BE가 발급하고 인증 픽스처가 쿠키에 주입하는 세션 토큰(값은 임의 — 목 /auth/me가 무조건 응답).
// server.ts(발급)와 fixtures/auth.ts(주입) 두 곳이 공유하므로 단일 출처로 둔다.
export const E2E_SESSION_TOKEN = "e2e-token";
