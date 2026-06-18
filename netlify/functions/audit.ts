import type { Config } from "@netlify/functions";
import { desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { auditLog } from "../../db/schema.js";

// Read-only access to the append-only audit trail, for reference and audit.
// Returns the most recent changes (without the full per-row snapshots, which
// can be large) so an operator can review who changed what and when.
export default async (req: Request) => {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 200, 1000);

  const rows = await db
    .select({
      id: auditLog.id,
      version: auditLog.version,
      actor: auditLog.actor,
      action: auditLog.action,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .orderBy(desc(auditLog.version))
    .limit(limit);

  return Response.json({ entries: rows });
};

export const config: Config = {
  path: "/api/audit",
};
