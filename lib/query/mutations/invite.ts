"use client";

import { useMutation } from "@tanstack/react-query";
import { API_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

type IssueResult = { code: string; expiresInSec: number };

export function useIssueInviteCode(unitId: string) {
  return useMutation({
    mutationFn: async (): Promise<IssueResult> => {
      const res = await fetch(API_ROUTES.unitInviteCodes(unitId), { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message ?? MESSAGES.invite.issueFailed);
      }
      return res.json();
    },
  });
}
