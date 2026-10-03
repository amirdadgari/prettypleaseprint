import { relativeTime } from "@/lib/catalog";
import type { NotificationIntegrationRow } from "@/lib/notification-integrations";
import { Button, Input, Label, Notice } from "@/components/ui";
import {
  connectBaleAction,
  disconnectIntegrationAction,
  testIntegrationAction,
  toggleIntegrationAction,
} from "@/app/settings/notification-actions";

export function NotificationIntegrationsPanel({
  integrations,
  error,
}: {
  integrations: NotificationIntegrationRow[];
  error?: string;
}) {
  const bale = integrations.find((integration) => integration.provider === "bale");

  return (
    <section id="notifications" className="mb-[35.2px] scroll-mt-[120px]">
      <div className="mb-[13.2px] flex flex-wrap items-end justify-between gap-[8.8px]">
        <div>
          <h2 className="m-0 font-display text-[26px] text-ink">Notifications</h2>
          <p className="m-0 mt-[5px] max-w-[68ch] text-[14.5px] leading-[1.5] text-ink-2">
            Send Activity updates outside the app. A provider outage never removes
            the in-app notification, and credentials are encrypted before storage.
          </p>
        </div>
        <span className="rounded-chip border-2 border-ink bg-aqua-wash px-[11px] py-[4px] font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink">
          {integrations.filter((integration) => integration.active).length} active
        </span>
      </div>

      {error && (
        <div className="mb-[13.2px]">
          <Notice tone="warn">{error}</Notice>
        </div>
      )}

      <div className="rounded-panel border-[3px] border-ink bg-porcelain shadow-stamp">
        <div className="flex flex-wrap items-center gap-[13.2px] border-b-[3px] border-ink bg-aqua-wash px-[17.6px] py-[13.2px]">
          <span aria-hidden className="flex h-[42px] w-[42px] items-center justify-center rounded-full border-[3px] border-ink bg-aqua font-display text-[18px] text-ink">
            B
          </span>
          <div className="min-w-[180px] flex-1">
            <h3 className="m-0 font-display text-[20px] text-ink">Bale bot</h3>
            <p className="m-0 mt-[2px] text-[13.5px] text-ink-2">
              Deliver new print requests and other Activity messages to a Bale chat.
            </p>
          </div>
          <span className={`rounded-chip border-2 border-ink px-[10px] py-[3px] font-mono text-[10.5px] font-bold uppercase tracking-[0.06em] ${
            bale?.active ? "bg-mint" : "bg-cream-2 text-ink-2"
          }`}>
            {bale?.active ? "On" : bale ? "Paused" : "Not connected"}
          </span>
        </div>

        {bale && (
          <div className="border-b-2 border-dashed border-rule px-[17.6px] py-[15px]">
            <div className="flex flex-wrap items-center gap-[11px]">
              <div className="min-w-[190px] flex-1">
                <p className="m-0 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">
                  Destination
                </p>
                <p className="m-0 mt-[3px] font-bold text-ink">{bale.destination}</p>
                <p className="m-0 mt-[4px] text-[12.5px] text-ink-3">
                  {bale.lastDeliveredAt
                    ? `Last delivered ${relativeTime(bale.lastDeliveredAt)}`
                    : "No successful delivery yet"}
                </p>
              </div>
              <form action={testIntegrationAction}>
                <input type="hidden" name="id" value={bale.id} />
                <Button type="submit" variant="secondary" className="px-[16px] py-[8px] text-[13px]">
                  Send test
                </Button>
              </form>
              <form action={toggleIntegrationAction}>
                <input type="hidden" name="id" value={bale.id} />
                <input type="hidden" name="active" value={bale.active ? "false" : "true"} />
                <Button type="submit" variant="ghost" className="px-[16px] py-[8px] text-[13px]">
                  {bale.active ? "Pause" : "Enable"}
                </Button>
              </form>
              <form action={disconnectIntegrationAction}>
                <input type="hidden" name="id" value={bale.id} />
                <button
                  type="submit"
                  className="cursor-pointer rounded-chip border-2 border-ink bg-cherry-wash px-[13px] py-[8px] font-mono text-[11px] font-bold uppercase text-ink hover:bg-cherry"
                >
                  Disconnect
                </button>
              </form>
            </div>
            {bale.lastError && (
              <p className="m-0 mt-[11px] rounded-card border-2 border-ink bg-sun px-[13px] py-[8px] text-[13px] text-ink">
                <strong>Last delivery failed:</strong> {bale.lastError}
              </p>
            )}
          </div>
        )}

        <form action={connectBaleAction} className="grid gap-[13.2px] p-[17.6px] sm:grid-cols-2">
          <div>
            <Label htmlFor="bale-token">Bot token</Label>
            <Input
              id="bale-token"
              name="token"
              type="password"
              required
              minLength={20}
              maxLength={240}
              autoComplete="off"
              spellCheck={false}
              placeholder={bale ? "Paste a new token to replace it" : "Token from Bale BotFather"}
            />
          </div>
          <div>
            <Label htmlFor="bale-chat-id">Chat ID</Label>
            <Input
              id="bale-chat-id"
              name="chatId"
              required
              maxLength={120}
              autoComplete="off"
              spellCheck={false}
              defaultValue={bale?.destination ?? ""}
              placeholder="84251697 or @channel"
            />
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-[11px]">
            <p className="m-0 max-w-[62ch] text-[12.5px] leading-[1.45] text-ink-3">
              Create a bot with{" "}
              <a
                href="https://ble.ir/botfather"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-cherry-dk underline decoration-2 underline-offset-2"
              >
                @BotFather
              </a>{" "}
              in Bale, start a chat with it, then paste its token and that
              chat&rsquo;s numeric ID. Connecting sends one test message; the token
              is never shown again.
            </p>
            <Button type="submit" className="px-[22px] py-[10px] text-[14px]">
              {bale ? "Replace connection" : "Connect Bale"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
