// 서버 전용 환경변수. 클라이언트 노출 prefix 사용 금지(보안).
export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";
