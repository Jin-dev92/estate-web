export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const isPassword = (v: string) => v.length >= 8;
export const isInviteCode = (v: string) => v.trim().length > 0;
