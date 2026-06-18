import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";

// Shared application state.
//
// The whole MAG acquisition app state (auction, vehicles, bids, transport,
// auction history, badges, store photos) is stored as a single JSON document
// in one row (id = 1). This is the live, shared source of truth that every
// browser reads from and writes to — replacing the old per-browser
// localStorage copy. `version` powers optimistic concurrency so simultaneous
// writers (e.g. several stores bidding at once) never silently clobber each
// other.
export const appState = pgTable("app_state", {
  id: integer().primaryKey(),
  data: jsonb().notNull(),
  version: integer().notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Append-only audit trail.
//
// Every successful write appends a row here with the full post-change
// snapshot, the actor (store / user id) and an action label, so the complete
// history of the auction is retained for reference and audit. Rows are never
// updated or deleted.
export const auditLog = pgTable("audit_log", {
  id: serial().primaryKey(),
  version: integer().notNull(),
  actor: text(),
  action: text(),
  snapshot: jsonb().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
