// src/lib/practice/key.ts
import crypto from "crypto";

const SECRET =
  process.env.PRACTICE_KEY_SECRET ||
  process.env.AUTH_SECRET ||
  "dev_secret_change_me";

export type PracticeKeyPayload = {
  instanceId: string;
  sessionId?: string | null;
  userId?: string | null;
  guestId?: string | null;
  exp: number; // unix seconds
};

function b64url(input: string) {
  return Buffer.from(input).toString("base64url");
}
function unb64url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function signPracticeKey(payload: PracticeKeyPayload) {
  const body = b64url(JSON.stringify(payload));
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

// ✅ harden: accept unknown (prevents key.split is not a function)
export function verifyPracticeKey(key: unknown): PracticeKeyPayload | null {
  if (typeof key !== "string") return null;

  const parts = key.split(".");
  if (parts.length !== 2) return null;

  const [body, sig] = parts;
  if (!body || !sig) return null;

  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(body)
    .digest("base64url");

  // ensure same length buffers
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;

  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  let payload: PracticeKeyPayload;
  try {
    payload = JSON.parse(unb64url(body)) as PracticeKeyPayload;
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp < now) return null;
  if (!payload.instanceId) return null;

  return payload;
}
