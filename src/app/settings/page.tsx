import { AppHeader } from "@/components/app-header";
import { NotificationIntegrationsPanel } from "@/components/notification-integrations-panel";
import { Toast } from "@/components/toast";
import { Kicker } from "@/components/ui";
import { requireAdmin } from "@/lib/authz";
import { listNotificationIntegrations } from "@/lib/notification-integrations";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ toast?: string; error?: string }>;
}) {
  const [{ toast, error }, admin] = await Promise.all([searchParams, requireAdmin()]);
  const integrations = await listNotificationIntegrations(admin.id);

  return (
    <>
      <AppHeader user={admin} active="/settings" />

      <main className="mx-auto w-full max-w-[1180px] px-[26.4px] pb-[80px] pt-[35.2px]">
        <div className="mb-[35.2px]">
          <Kicker>Behind the counter</Kicker>
          <h1 className="m-0 text-[38px] leading-[1] text-ink">Settings</h1>
          <p className="m-0 mt-[8px] max-w-[68ch] text-[15.5px] leading-[1.5] text-ink-2">
            Choose how Pretty Please Print delivers activity outside the app and
            manage the services connected to the printer.
          </p>
        </div>

        <NotificationIntegrationsPanel integrations={integrations} error={error} />
      </main>

      {toast && <Toast>{toast}</Toast>}
    </>
  );
}
