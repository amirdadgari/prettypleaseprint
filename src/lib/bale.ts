import { z } from "zod";

const BotTokenSchema = z
  .string()
  .trim()
  .min(20, "Paste the bot token from Bale's BotFather.")
  .max(240, "That bot token is unexpectedly long.")
  .regex(/^[A-Za-z0-9:_-]+$/, "That does not look like a Bale bot token.");

const ChatIdSchema = z
  .string()
  .trim()
  .min(1, "Enter the Bale chat ID.")
  .max(120, "That chat ID is unexpectedly long.")
  .regex(/^(?:-?\d+|@[A-Za-z0-9_]{3,})$/, "Use a numeric chat ID or an @channel username.");

export type BaleCredentials = { token: string; chatId: string };

export class BaleProblem extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BaleProblem";
  }
}

export function parseBaleCredentials(token: unknown, chatId: unknown): BaleCredentials {
  const parsed = z.object({ token: BotTokenSchema, chatId: ChatIdSchema }).safeParse({
    token: typeof token === "string" ? token : "",
    chatId: typeof chatId === "string" ? chatId : "",
  });
  if (!parsed.success) {
    throw new BaleProblem(parsed.error.issues[0]?.message ?? "Check the Bale settings.");
  }
  return parsed.data;
}

type Fetcher = typeof fetch;
type BaleEnvelope = { ok?: boolean; description?: string; result?: unknown };

async function callBale(
  credentials: BaleCredentials,
  method: "getMe" | "sendMessage",
  body: Record<string, unknown>,
  fetcher: Fetcher,
): Promise<BaleEnvelope> {
  let response: Response;
  try {
    response = await fetcher(`https://tapi.bale.ai/bot${credentials.token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(6_000),
      cache: "no-store",
    });
  } catch {
    throw new BaleProblem("Bale could not be reached. Check the server's network and try again.");
  }

  let envelope: BaleEnvelope = {};
  try {
    envelope = (await response.json()) as BaleEnvelope;
  } catch {
    // The status below still gives the operator a useful, non-secret error.
  }
  if (!response.ok || envelope.ok !== true) {
    const detail = envelope.description?.slice(0, 180);
    throw new BaleProblem(detail || `Bale refused the request (HTTP ${response.status}).`);
  }
  return envelope;
}

/** Validate a token without exposing it or sending a message. */
export async function verifyBaleBot(
  credentials: BaleCredentials,
  fetcher: Fetcher = fetch,
): Promise<void> {
  await callBale(credentials, "getMe", {}, fetcher);
}

/** Send one plain-text message through Bale's Telegram-compatible Bot API. */
export async function sendBaleMessage(
  credentials: BaleCredentials,
  text: string,
  fetcher: Fetcher = fetch,
): Promise<void> {
  await callBale(credentials, "sendMessage", {
    chat_id: credentials.chatId,
    text: text.slice(0, 4096),
  }, fetcher);
}
