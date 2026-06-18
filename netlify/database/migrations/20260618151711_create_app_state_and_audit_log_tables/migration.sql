CREATE TABLE "app_state" (
	"id" integer PRIMARY KEY,
	"data" jsonb NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY,
	"version" integer NOT NULL,
	"actor" text,
	"action" text,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
