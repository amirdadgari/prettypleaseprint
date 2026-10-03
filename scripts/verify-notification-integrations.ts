import assert from "node:assert/strict";

import {
  BaleProblem,
  parseBaleCredentials,
  sendBaleMessage,
  verifyBaleBot,
} from "../src/lib/bale";
import {
  openNotificationSecret,
  sealNotificationSecret,
} from "../src/lib/notification-secrets";

process.env.BETTER_AUTH_SECRET = "verification-only-secret-with-at-least-32-bytes";

const credentials = parseBaleCredentials("123456789:verification_token", "84251697");
const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
const okFetch = (async (input: string | URL | Request, init?: RequestInit) => {
  calls.push({ url: String(input), body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown> });
  return new Response(JSON.stringify({ ok: true, result: {} }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}) as typeof fetch;

await verifyBaleBot(credentials, okFetch);
await sendBaleMessage(credentials, "A new print request", okFetch);
assert.equal(calls.length, 2);
assert.match(calls[0]!.url, /\/getMe$/);
assert.match(calls[1]!.url, /\/sendMessage$/);
assert.deepEqual(calls[1]!.body, { chat_id: "84251697", text: "A new print request" });

const sealed = sealNotificationSecret(credentials.token);
assert.notEqual(sealed, credentials.token);
assert.ok(!sealed.includes(credentials.token));
assert.equal(openNotificationSecret(sealed), credentials.token);

const refusedFetch = (async () => new Response(
  JSON.stringify({ ok: false, description: "chat not found" }),
  { status: 400, headers: { "content-type": "application/json" } },
)) as typeof fetch;
await assert.rejects(
  () => sendBaleMessage(credentials, "test", refusedFetch),
  (error: unknown) => error instanceof BaleProblem && error.message === "chat not found",
);

assert.throws(
  () => parseBaleCredentials("short", "not a chat id"),
  BaleProblem,
);

console.log("verify:notifications — Bale validation, delivery and secret encryption pass");
