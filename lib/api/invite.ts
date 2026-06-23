import { call } from "./client";
import { MESSAGES } from "../messages";

export const backendPreviewInvite = (code: string) =>
  call<{ valid: boolean; buildingName?: string; unitName?: string }>(
    `/invite-codes/${encodeURIComponent(code)}/preview`, { method: "GET" }, {});

export const backendRedeemInvite = (token: string, code: string) =>
  call<{ id: string; unitId: string; status: string }>("/invite-codes/redeem",
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ code }) },
    { 404: MESSAGES.invite.invalid });

export const backendIssueInvite = (t: string, unitId: string) =>
  call<{ code: string; expiresInSec: number }>(`/units/${unitId}/invite-codes`,
    { method: "POST", headers: { Authorization: `Bearer ${t}` } }, {});
