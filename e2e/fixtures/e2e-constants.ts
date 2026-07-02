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

// 알림 E2E 결합 상수(목 BE와 테스트가 공유).
// 미읽음 알림은 PostAdded 타입 + 게시판 결합키(buildingId/entityId)를 물려
// 클릭 시 딥링크가 게시글 상세(/board/b-e2e/p-e2e)로 향하게 한다.
export const E2E_NOTIFICATION = {
  unreadId: "n-unread-e2e",
  unreadTitle: "새 공지가 등록됐어요",
  unreadBody: "건물 게시판에 새 글이 올라왔어요.",
  readId: "n-read-e2e",
  readTitle: "댓글이 달렸어요",
  readBody: "내 글에 새 댓글이 달렸어요.",
} as const;

// 회원가입 E2E 신규 계정 입력값(목 BE는 무상태라 중복 검사 없이 성공만 표현).
export const E2E_SIGNUP = {
  ownerName: "김건물",
  ownerEmail: "owner@e2e.test",
  tenantName: "박입주",
  tenantEmail: "newtenant@e2e.test",
  password: "password123",
} as const;

// 입주자 초대 E2E 결합 상수(목 BE와 테스트가 공유).
// validCode만 미리보기 valid=true → 건물/호실 노출, 그 외 코드는 valid=false.
export const E2E_INVITE = {
  validCode: "E2ECODE1",
  invalidCode: "BADCODE0",
  buildingName: "터전빌라",
  unitName: "101호",
} as const;

// 건물·호실·초대코드 발급 E2E 결합 상수(OWNER, 목 BE와 테스트가 공유).
export const E2E_BUILDING = {
  id: "b-owner-e2e",
  name: "터전오너빌딩",
  address: "서울시 터전구 1-2",
  unitId: "unit-owner-e2e",
  unitName: "201호",
  floor: 2,
  issuedCode: "OWNER1CODE",
  expiresInSec: 600,
} as const;
