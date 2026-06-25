"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { API_ROUTES, PAGE_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch(API_ROUTES.session, { method: "DELETE" });
    router.push(PAGE_ROUTES.login);
    router.refresh();
  }

  return (
    <Button variant="secondary" onClick={logout}>{MESSAGES.settings.logout}</Button>
  );
}
