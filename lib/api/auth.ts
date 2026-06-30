import { post, authGet, authPatch } from "./client";
import { MESSAGES } from "../messages";
import { SignupRole } from "../constants";
export type { SignupRole };

export type Me = { id: string; email: string; role: "OWNER" | "TENANT" | "ADMIN" };

export const backendSignup = (email: string, name: string, password: string, role: SignupRole) =>
  post<{ id: string; email: string; role: string }>("/auth/signup",
    { email, name, password, role },
    { 400: MESSAGES.form.invalidInput, 409: MESSAGES.auth.emailInUse });

export const backendLogin = (email: string, password: string) =>
  post<{ accessToken: string }>("/auth/login",
    { email, password },
    { 401: MESSAGES.auth.invalidCredentials });

export const backendMe = (t: string) => authGet<Me>("/auth/me", t);

export type Profile = { id: string; email: string; name: string; role: "OWNER" | "TENANT" | "ADMIN" };

export const backendProfile = (t: string) => authGet<Profile>("/auth/profile", t);

export const backendUpdateProfile = (t: string, body: { name: string }) =>
  authPatch<Profile>("/auth/profile", t, body);

export const backendChangePassword = (t: string, body: { currentPassword: string; newPassword: string }) =>
  authPatch<{ ok: true }>("/auth/password", t, body, { 401: MESSAGES.settings.wrongCurrentPassword });
