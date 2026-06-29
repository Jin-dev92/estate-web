"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { API_ROUTES, PAGE_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

export function LogoutButton() {
  const router = useRouter();
  const { mutate, isPending } = useMutation({
    mutationFn: () => fetch(API_ROUTES.session, { method: "DELETE" }),
    onSuccess: () => {
      router.push(PAGE_ROUTES.login);
      router.refresh();
    },
  });

  return (
    <Button variant="secondary" onClick={() => mutate()} disabled={isPending}>
      {MESSAGES.settings.logout}
    </Button>
  );
}
