/**
 * 사용자 노출 카피(copy) 단일 출처.
 * 식별자(쿠키명·역할·API 경로)는 lib/constants.ts, 사용자 문구는 여기.
 * 추후 다국어가 필요하면 i18n 카탈로그로 승격한다.
 */
export const MESSAGES = {
  auth: {
    invalidCredentials: "이메일 또는 비밀번호를 확인하세요",
    emailInUse: "이미 가입된 이메일입니다",
    loginFailed: "로그인하지 못했어요. 잠시 후 다시 시도해주세요.",
    signupFailed: "가입을 완료하지 못했어요. 잠시 후 다시 시도해주세요.",
  },
  form: {
    invalidInput: "입력값을 확인해주세요",
    signupInvalid: "입력값을 확인해주세요(비밀번호 8자 이상)",
  },
  invite: {
    required: "초대코드를 입력하세요",
    invalid: "유효하지 않거나 만료된 초대코드입니다",
    raceExpired: "코드가 막 만료/사용되었어요. 다시 입력해주세요.",
    issueFailed: "초대코드 발급에 실패했어요. 잠시 후 다시 시도해주세요.",
  },
  common: {
    requestFailed: "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.",
  },
  building: { createFailed: "건물 생성에 실패했어요. 잠시 후 다시 시도해주세요." },
  unit: { createFailed: "호실 생성에 실패했어요. 잠시 후 다시 시도해주세요." },
} as const;
