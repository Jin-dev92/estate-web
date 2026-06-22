import { call, authGet } from "./client";
import { MESSAGES } from "../messages";
import { SignupRole } from "../constants";
export type { SignupRole };

export type Me = { id: string; email: string; role: "OWNER" | "TENANT" | "ADMIN" };

export const backendSignup = (email: string, name: string, password: string, role: SignupRole) =>
  call<{ id: string; email: string; role: string }>("/auth/signup",
    { method: "POST", body: JSON.stringify({ email, name, password, role }) },
    { 400: MESSAGES.form.invalidInput, 409: MESSAGES.auth.emailInUse });

export const backendLogin = (email: string, password: string) =>
  call<{ accessToken: string }>("/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
    { 401: MESSAGES.auth.invalidCredentials });

export const backendMe = (t: string) => authGet<Me>("/auth/me", t);
