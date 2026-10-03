"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/authz";
import {
  NotificationIntegrationProblem,
  connectBale,
  disconnectNotificationIntegration,
  setNotificationIntegrationActive,
  testNotificationIntegration,
} from "@/lib/notification-integrations";

function back(params: Record<string, string>): never {
  const query = new URLSearchParams(params).toString();
  redirect(`/me?${query}#notifications`);
}

function integrationId(formData: FormData): string {
  return String(formData.get("id") ?? "");
}

export async function connectBaleAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  try {
    await connectBale(admin, formData.get("token"), formData.get("chatId"));
    back({ toast: "Bale connected and test message sent" });
  } catch (error) {
    if (error instanceof NotificationIntegrationProblem) back({ error: error.message });
    throw error;
  }
}

export async function testIntegrationAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  try {
    await testNotificationIntegration(admin, integrationId(formData));
    back({ toast: "Test notification sent" });
  } catch (error) {
    if (error instanceof NotificationIntegrationProblem) back({ error: error.message });
    throw error;
  }
}

export async function toggleIntegrationAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const active = formData.get("active") === "true";
  try {
    await setNotificationIntegrationActive(admin, integrationId(formData), active);
    back({ toast: active ? "Bale notifications enabled" : "Bale notifications paused" });
  } catch (error) {
    if (error instanceof NotificationIntegrationProblem) back({ error: error.message });
    throw error;
  }
}

export async function disconnectIntegrationAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  try {
    await disconnectNotificationIntegration(admin, integrationId(formData));
    back({ toast: "Bale disconnected" });
  } catch (error) {
    if (error instanceof NotificationIntegrationProblem) back({ error: error.message });
    throw error;
  }
}
