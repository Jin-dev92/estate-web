import { call, authPost } from "./client";
import { MESSAGES } from "../messages";

export const backendPreviewInvite = (code: string) =>
  call<{ valid: boolean; buildingName?: string; unitName?: string }>(
    `/invite-codes/${encodeURIComponent(code)}/preview`, { method: "GET" });

export const backendRedeemInvite = (token: string, code: string) =>
  authPost<{ id: string; unitId: string; status: string }>("/invite-codes/redeem", token, { code },
    { 404: MESSAGES.invite.invalid });

export const backendIssueInvite = (t: string, unitId: string) =>
  authPost<{ code: string; expiresInSec: number }>(`/units/${unitId}/invite-codes`, t);
