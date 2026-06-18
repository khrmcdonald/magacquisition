import type { Config } from "@netlify/functions";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appState, auditLog } from "../../db/schema.js";

const ROW_ID = 1;

async function getCurrent() {
  const [row] = await db.select().from(appState).where(eq(appState.id, ROW_ID));
  return row || null;
}

export default async (req: Request) => {
  // Read the shared state document. A fresh database has no row yet, which is
  // the intended blank-slate starting point — callers fall back to their own
  // empty defaults when `data` is null.
  if (req.method === "GET") {
    const current = await getCurrent();
    if (!current) return Response.json({ data: null, version: 0 });
    return Response.json({ data: current.data, version: current.version });
  }

  if (req.method === "POST") {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const { data, baseVersion = 0, actor = null, action = "update" } = body || {};
    if (data == null || typeof data !== "object") {
      return new Response("Missing data", { status: 400 });
    }

    let newVersion: number;

    // Optimistic concurrency: only advance the row if its version still
    // matches the version the client based its change on. This is a single
    // atomic statement, so concurrent writers can't both win.
    const updated = await db
      .update(appState)
      .set({ data, version: baseVersion + 1, updatedAt: new Date() })
      .where(and(eq(appState.id, ROW_ID), eq(appState.version, baseVersion)))
      .returning();

    if (updated.length > 0) {
      newVersion = updated[0].version;
    } else {
      // No row matched. Either this is the very first write, or someone else
      // moved the version forward since the client last read.
      const current = await getCurrent();
      if (!current) {
        const inserted = await db
          .insert(appState)
          .values({ id: ROW_ID, data, version: 1 })
          .onConflictDoNothing()
          .returning();
        if (inserted.length > 0) {
          newVersion = inserted[0].version;
        } else {
          const raced = await getCurrent();
          return Response.json(
            { conflict: true, data: raced?.data ?? null, version: raced?.version ?? 0 },
            { status: 409 }
          );
        }
      } else {
        return Response.json(
          { conflict: true, data: current.data, version: current.version },
          { status: 409 }
        );
      }
    }

    // Record the change in the append-only audit trail.
    await db.insert(auditLog).values({ version: newVersion, actor, action, snapshot: data });

    return Response.json({ ok: true, version: newVersion });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/state",
};
