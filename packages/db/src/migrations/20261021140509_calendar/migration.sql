CREATE TYPE "event_kind" AS ENUM('public', 'private', 'free_weekend');--> statement-breakpoint
CREATE TABLE "calendar_event" (
	"id" serial PRIMARY KEY,
	"kind" "event_kind" NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"time" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"link" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekend_request" (
	"id" serial PRIMARY KEY,
	"event_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"message" text NOT NULL,
	"status" "request_status" DEFAULT 'new'::"request_status" NOT NULL,
	"email_failed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"handled_at" timestamp
);
--> statement-breakpoint
CREATE INDEX "calendar_event_dates_idx" ON "calendar_event" ("starts_on","ends_on");--> statement-breakpoint
CREATE INDEX "weekend_request_event_idx" ON "weekend_request" ("event_id");--> statement-breakpoint
ALTER TABLE "weekend_request" ADD CONSTRAINT "weekend_request_event_id_calendar_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "calendar_event"("id") ON DELETE RESTRICT;