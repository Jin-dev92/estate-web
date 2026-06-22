import { isEmail, isPassword, isInviteCode } from "@/lib/validation";

describe("validation", () => {
  it("이메일 형식", () => {
    expect(isEmail("a@b.com")).toBe(true);
    expect(isEmail("nope")).toBe(false);
  });
  it("비밀번호 8자 이상", () => {
    expect(isPassword("pw123456")).toBe(true);
    expect(isPassword("short")).toBe(false);
  });
  it("초대코드 비어있지 않음", () => {
    expect(isInviteCode("A1B2C3D4")).toBe(true);
    expect(isInviteCode("")).toBe(false);
  });
});
