import { redirect } from "next/navigation";

export default async function Invite({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  redirect(`/signup/tenant${code ? `?code=${encodeURIComponent(code)}` : ""}`);
}
