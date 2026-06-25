import { redirect } from "next/navigation";
import { getToken } from "@/lib/session";
import { backendProfile, type Profile } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { EmptyState } from "@/components/ui/empty-state";
import { ProfileForm } from "@/components/settings/profile-form";
import { PasswordForm } from "@/components/settings/password-form";
import { LogoutButton } from "@/components/settings/logout-button";
import { PAGE_ROUTES, ROLE_LABEL } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

export default async function SettingsPage() {
  const token = await getToken();
  if (!token) redirect(PAGE_ROUTES.login);

  let profile: Profile | null = null;
  try {
    profile = await backendProfile(token);
  } catch {
    profile = null;
  }

  if (!profile) {
    return (
      <>
        <h1 className="mb-4 text-[22px] font-extrabold tracking-tight">{MESSAGES.settings.title}</h1>
        <EmptyState text={MESSAGES.common.requestFailed} />
      </>
    );
  }

  return (
    <>
      <h1 className="mb-4 text-[22px] font-extrabold tracking-tight">{MESSAGES.settings.title}</h1>

      <Card className="p-0">
        <div className="divide-y divide-border px-4">
          <ListRow title={MESSAGES.settings.email} meta={profile.email} />
          <ListRow title={MESSAGES.settings.role} meta={ROLE_LABEL[profile.role] ?? profile.role} />
        </div>
      </Card>

      <section className="mt-6">
        <h2 className="mb-2 px-0.5 text-[16px] font-bold">{MESSAGES.settings.profile}</h2>
        <Card>
          <ProfileForm defaultName={profile.name} />
        </Card>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 px-0.5 text-[16px] font-bold">{MESSAGES.settings.changePassword}</h2>
        <Card>
          <PasswordForm />
        </Card>
      </section>

      <section className="mt-6">
        <LogoutButton />
      </section>
    </>
  );
}
