import { z } from "zod";
import { MESSAGES } from "./messages";

export const loginSchema = z.object({
  email: z.email(MESSAGES.auth.invalidCredentials),
  password: z.string().min(8, MESSAGES.auth.invalidCredentials),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  name: z.string().min(1, MESSAGES.form.signupInvalid),
  email: z.email(MESSAGES.form.signupInvalid),
  password: z.string().min(8, MESSAGES.form.signupInvalid),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const inviteCodeSchema = z.object({
  code: z.string().min(1, MESSAGES.invite.required),
});
export type InviteCodeInput = z.infer<typeof inviteCodeSchema>;

export const buildingSchema = z.object({
  name: z.string().min(1, MESSAGES.form.invalidInput),
  address: z.string().min(1, MESSAGES.form.invalidInput),
});
export type BuildingInput = z.infer<typeof buildingSchema>;

export const unitSchema = z.object({
  name: z.string().min(1, MESSAGES.form.invalidInput),
  floor: z.coerce.number().int(),
});
export type UnitInput = z.infer<typeof unitSchema>;
