import { NextResponse } from "next/server";

/**
 * Replace this with your existing auth() / session role logic.
 * For now, it just allows everything in dev and blocks in prod if no header is set.
 */
export async function requireAdmin(req: Request) {
  if (process.env.NODE_ENV !== "production") return;

  // Example: require a header in production (temporary).
  // Replace with session role check.
  const ok = req.headers.get("x-admin") === "1";
  if (!ok) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
