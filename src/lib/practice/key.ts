// src/lib/practice/key.ts
import crypto from "crypto";

const SECRET = process.env.PRACTICE_KEY_SECRET || process.env.NEXTAUTH_SECRET || "dev_secret_change_me";

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
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyPracticeKey(key: string): PracticeKeyPayload | null {
  const [body, sig] = key.split(".");
  if (!body || !sig) return null;

  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

  const payload = JSON.parse(unb64url(body)) as PracticeKeyPayload;
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) return null;

  return payload;
}
