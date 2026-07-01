// E2E 계약 상수 — 목 BE와 테스트가 공유하는 결합 식별자(단일 출처).
export const E2E_CREDENTIALS = {
  tenantEmail: "tenant@e2e.test",
  password: "password123",
  // 목 BE가 이 이메일이면 401을 반환한다(로그인 실패 경로 트리거).
  failEmail: "fail@e2e.test",
} as const;
