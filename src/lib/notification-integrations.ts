import "server-only";

import { revalidatePath } from "next/cache";

import { BaleProblem, parseBaleCredentials, sendBaleMessage, verifyBaleBot } from "@/lib/bale";
import { record } from "@/lib/audit";
import { db } from "@/lib/db";
import { openNotificationSecret, sealNotificationSecret } from "@/lib/notification-secrets";
import type { Actor } from "@/lib/scope";

export const NOTIFICATION_PROVIDERS = ["bale"] as const;
export type NotificationProvider = (typeof NOTIFICATION_PROVIDERS)[number];

export class NotificationIntegrationProblem extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotificationIntegrationProblem";
  }
}

export type NotificationIntegrationRow = {
  id: string;
  provider: string;
  destination: string;
  active: boolean;
  lastDeliveredAt: Date | null;
  lastError: string | null;
};

const PUBLIC_SELECT = {
  id: true,
  provider: true,
  destination: true,
  active: true,
  lastDeliveredAt: true,
  lastError: true,
} as const;

function assertAdmin(actor: Actor) {
  if (actor.role !== "admin") {
    throw new NotificationIntegrationProblem("Only the printer owner manages notification integrations.");
  }
}

function refresh() {
  revalidatePath("/me");
}

export function listNotificationIntegrations(userId: string): Promise<NotificationIntegrationRow[]> {
  return db.notificationIntegration.findMany({
    where: { userId },
    select: PUBLIC_SELECT,
    orderBy: { provider: "asc" },
  });
}

export async function connectBale(
  actor: Actor,
  rawToken: unknown,
  rawChatId: unknown,
): Promise<NotificationIntegrationRow> {
  assertAdmin(actor);
  let credentials;
  try {
    credentials = parseBaleCredentials(rawToken, rawChatId);
    await verifyBaleBot(credentials);
    await sendBaleMessage(
      credentials,
      "Pretty Please Print is connected. New activity will arrive here.",
    );
  } catch (error) {
    if (error instanceof BaleProblem) throw new NotificationIntegrationProblem(error.message);
    throw error;
  }

  const integration = await db.notificationIntegration.upsert({
    where: { userId_provider: { userId: actor.id, provider: "bale" } },
    create: {
      userId: actor.id,
      provider: "bale",
      destination: credentials.chatId,
      secret: sealNotificationSecret(credentials.token),
      active: true,
      lastDeliveredAt: new Date(),
      lastError: null,
    },
    update: {
      destination: credentials.chatId,
      secret: sealNotificationSecret(credentials.token),
      active: true,
      lastDeliveredAt: new Date(),
      lastError: null,
    },
    select: PUBLIC_SELECT,
  });

  await record({
    action: "notification.integration_connected",
    actor,
    subject: "Bale",
    detail: { provider: "bale" },
  });
  refresh();
  return integration;
}

async function ownedIntegration(actor: Actor, id: string) {
  assertAdmin(actor);
  const integration = await db.notificationIntegration.findFirst({
    where: { id, userId: actor.id },
  });
  if (!integration) throw new NotificationIntegrationProblem("That integration no longer exists.");
  return integration;
}

export async function testNotificationIntegration(actor: Actor, id: string): Promise<void> {
  const integration = await ownedIntegration(actor, id);
  try {
    if (integration.provider === "bale") {
      await sendBaleMessage(
        { token: openNotificationSecret(integration.secret), chatId: integration.destination },
        "Test from Pretty Please Print — this notification integration works.",
      );
    } else {
      throw new NotificationIntegrationProblem("That notification provider is not supported.");
    }
    await db.notificationIntegration.update({
      where: { id: integration.id },
      data: { lastDeliveredAt: new Date(), lastError: null },
    });
  } catch (error) {
    const message = safeDeliveryError(error);
    await db.notificationIntegration.update({
      where: { id: integration.id },
      data: { lastError: message },
    });
    throw new NotificationIntegrationProblem(message);
  }

  await record({
    action: "notification.integration_tested",
    actor,
    subject: "Bale",
    detail: { provider: integration.provider },
  });
  refresh();
}

export async function setNotificationIntegrationActive(
  actor: Actor,
  id: string,
  active: boolean,
): Promise<void> {
  const integration = await ownedIntegration(actor, id);
  await db.notificationIntegration.update({ where: { id: integration.id }, data: { active } });
  await record({
    action: active ? "notification.integration_enabled" : "notification.integration_disabled",
    actor,
    subject: integration.provider === "bale" ? "Bale" : integration.provider,
    detail: { provider: integration.provider },
  });
  refresh();
}

export async function disconnectNotificationIntegration(actor: Actor, id: string): Promise<void> {
  const integration = await ownedIntegration(actor, id);
  await db.notificationIntegration.delete({ where: { id: integration.id } });
  await record({
    action: "notification.integration_disconnected",
    actor,
    subject: integration.provider === "bale" ? "Bale" : integration.provider,
    detail: { provider: integration.provider },
  });
  refresh();
}

function safeDeliveryError(error: unknown): string {
  if (error instanceof BaleProblem || error instanceof NotificationIntegrationProblem) {
    return error.message.slice(0, 240);
  }
  return "Delivery failed. Test the integration from your profile.";
}

function notificationUrl(storyId?: number | null, featureId?: number | null): string {
  const path = storyId ? `/story/${storyId}` : featureId ? `/frr/${featureId}` : "/";
  return new URL(path, process.env.BETTER_AUTH_URL ?? "http://localhost:3000").toString();
}

/**
 * Fan an in-app notification out to every active provider for its recipient.
 * Delivery is best-effort: the database notification is authoritative and a
 * provider outage must never undo the action that created it.
 */
export async function deliverNotification(input: {
  recipientId: string;
  storyId?: number | null;
  featureId?: number | null;
  text: string;
}): Promise<void> {
  const integrations = await db.notificationIntegration.findMany({
    where: { userId: input.recipientId, active: true },
  });
  if (integrations.length === 0) return;

  const message = `Pretty Please Print\n${input.text}\n${notificationUrl(input.storyId, input.featureId)}`;

  await Promise.all(integrations.map(async (integration) => {
    try {
      if (integration.provider === "bale") {
        await sendBaleMessage(
          { token: openNotificationSecret(integration.secret), chatId: integration.destination },
          message,
        );
      } else {
        throw new NotificationIntegrationProblem("Unsupported notification provider.");
      }
      await db.notificationIntegration.updateMany({
        where: { id: integration.id },
        data: { lastDeliveredAt: new Date(), lastError: null },
      });
    } catch (error) {
      const message = safeDeliveryError(error);
      console.error(`[notifications] ${integration.provider} delivery failed for integration ${integration.id}: ${message}`);
      await db.notificationIntegration.updateMany({
        where: { id: integration.id },
        data: { lastError: message },
      });
    }
  }));
}
