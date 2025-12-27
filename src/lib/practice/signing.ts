import crypto from "crypto";
import type { Difficulty, Exercise, Topic } from "./types";

type KeyPayload = {
  v: 1;
  issuedAt: number;
  topic: Topic | "all";
  difficulty: Difficulty | "all";
  exercise: Exercise; // includes correctValue / correctOptionId etc (tamper-proof)
};

function base64url(input: Buffer | string) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return b
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlDecode(s: string) {
  const pad = 4 - (s.length % 4 || 4);
  const padded = s + "=".repeat(pad === 4 ? 0 : pad);
  const b64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64");
}

function getSecret() {
  const secret = process.env.PRACTICE_SECRET;
  if (!secret) {
    throw new Error("Missing PRACTICE_SIGNING_SECRET env var");
  }
  return secret;
}

export async function signKey(args: {
  topic: Topic | "all";
  difficulty: Difficulty | "all";
  exercise: Exercise;
}): Promise<string> {
  const payload: KeyPayload = {
    v: 1,
    issuedAt: Date.now(),
    topic: args.topic,
    difficulty: args.difficulty,
    exercise: args.exercise,
  };

  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64url(payloadJson);

  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(payloadB64)
    .digest();

  const sigB64 = base64url(sig);
  return `${payloadB64}.${sigB64}`;
}

export function verifyKey(key: string): KeyPayload {
  const [payloadB64, sigB64] = key.split(".");
  if (!payloadB64 || !sigB64) throw new Error("Invalid key format");

  const expectedSig = crypto
    .createHmac("sha256", getSecret())
    .update(payloadB64)
    .digest();

  const expectedSigB64 = base64url(expectedSig);

  // timing-safe compare
  const a = Buffer.from(sigB64);
  const b = Buffer.from(expectedSigB64);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error("Invalid key signature");
  }

  const payloadJson = base64urlDecode(payloadB64).toString("utf8");
  const payload = JSON.parse(payloadJson) as KeyPayload;

  if (payload.v !== 1) throw new Error("Unsupported key version");
  return payload;
}
