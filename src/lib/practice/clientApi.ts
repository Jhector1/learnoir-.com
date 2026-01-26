// src/lib/practice/clientApi.ts
import type { Difficulty, Exercise, SubmitAnswer, TopicSlug, ValidateResponse } from "./types";

export type PracticeGetResponse = {
  exercise?: Exercise;
  key?: string;
  sessionId?: string | null;
  meta?: any;

  // optional "complete" sentinel (recommended for assignments)
  complete?: boolean;
  message?: string;
  explanation?: string;
};

const PRACTICE_GET_PATH = "/api/practice";
// ✅ change this if your POST handler lives elsewhere
const PRACTICE_SUBMIT_PATH = "/api/practice/validate";

function baseOrigin() {
  // browser only (PracticeClient is "use client")
  return window.location.origin;
}

function buildUrl(path: string, params?: Record<string, string | undefined>) {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, baseOrigin());
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

async function readJsonOrExplain(res: Response) {
  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  const text = await res.text();

  // If we got HTML, this is almost certainly a bad URL (locale-prefixed / missing leading slash).
  if (ct.includes("text/html") || text.trim().startsWith("<!DOCTYPE html")) {
    const hint =
      `Non-JSON response (status ${res.status}). ` +
      `You are hitting an HTML route (likely a 404 page), not the API handler.\n` +
      `Fix: ensure client fetch uses "/api/..." (leading slash).`;
    throw new Error(`${hint}\nSnippet: ${text.slice(0, 200)}`);
  }

  if (!text) throw new Error(`Empty response body (status ${res.status})`);

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (status ${res.status}): ${text.slice(0, 200)}`);
  }
}

function errMsgFromPayload(payload: any, fallback: string) {
  if (!payload) return fallback;
  return (
    payload.message ||
    payload.error ||
    payload.explanation ||
    payload.detail ||
    fallback
  );
}

// ---------------- GET: next exercise ----------------

export async function fetchPracticeExercise(args: {
  sessionId?: string;
  topic?: string; // TopicSlug | "all"
  difficulty?: Difficulty;
  section?: string;
  allowReveal?: boolean;
  signal?: AbortSignal;
}): Promise<PracticeGetResponse> {
  const url = buildUrl(PRACTICE_GET_PATH, {
    sessionId: args.sessionId,
    topic: args.topic,
    difficulty: args.difficulty,
    section: args.section,
    allowReveal: args.allowReveal ? "true" : undefined,
  });

  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    signal: args.signal,
    headers: {
      accept: "application/json",
    },
  });

  const payload = await readJsonOrExplain(res);

  // Handle non-2xx as a thrown Error with useful message
  if (!res.ok) {
    throw new Error(errMsgFromPayload(payload, `Request failed (status ${res.status})`));
  }

  // Optional: support "complete" sentinel
  // (recommended so assignment completion is not treated as an error)
  if (payload?.complete) {
    return payload as PracticeGetResponse;
  }

  // Validate shape (prevents "Cannot read properties of undefined (reading 'kind')")
  if (!payload?.exercise || typeof payload?.exercise?.kind !== "string" || typeof payload?.key !== "string") {
    throw new Error(
      `Practice API returned invalid payload (missing exercise/key). ` +
        `Got: ${JSON.stringify(
          { hasExercise: !!payload?.exercise, keyType: typeof payload?.key, kind: payload?.exercise?.kind },
          null,
          2
        )}`
    );
  }

  return payload as PracticeGetResponse;
}

// ---------------- POST: validate / reveal ----------------

export async function submitPracticeAnswer(args: {
  key: string;
  answer?: SubmitAnswer;
  reveal?: boolean;
  signal?: AbortSignal;
}): Promise<ValidateResponse & any> {
  const url = buildUrl(PRACTICE_SUBMIT_PATH);

  const res = await fetch(url, {
    method: "POST",
    cache: "no-store",
    signal: args.signal,
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      key: args.key,
      answer: args.answer ?? null,
      reveal: args.reveal ?? false,
    }),
  });

  const payload = await readJsonOrExplain(res);

  if (!res.ok) {
    throw new Error(errMsgFromPayload(payload, `Submit failed (status ${res.status})`));
  }

  return payload as any;
}
