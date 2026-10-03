import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const CONTEXT = "pretty-please-print:notification-integrations:v1";

function key(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is required to protect notification credentials.");
  return createHash("sha256").update(CONTEXT).update("\0").update(secret).digest();
}

/** AES-GCM authenticated encryption; the stored value is versioned for rotation. */
export function sealNotificationSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function openNotificationSecret(value: string): string {
  const [version, ivText, tagText, encryptedText] = value.split(".");
  if (version !== "v1" || !ivText || !tagText || !encryptedText) {
    throw new Error("Unsupported notification credential format.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
