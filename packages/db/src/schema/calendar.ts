import {
	boolean,
	date,
	index,
	integer,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

import { requestStatus } from "./courses";

export const eventKind = pgEnum("event_kind", [
	"public",
	"private",
	"free_weekend",
]);

export const calendarEvent = pgTable(
	"calendar_event",
	{
		id: serial("id").primaryKey(),
		kind: eventKind("kind").notNull(),
		// Private: shown publicly instead of "Varattu" when set.
		title: text("title").notNull().default(""),
		startsOn: date("starts_on").notNull(),
		endsOn: date("ends_on").notNull(),
		time: text("time").notNull().default(""),
		location: text("location").notNull().default(""),
		description: text("description").notNull().default(""),
		link: text("link").notNull().default(""),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [index("calendar_event_dates_idx").on(t.startsOn, t.endsOn)],
);

export const weekendRequest = pgTable(
	"weekend_request",
	{
		id: serial("id").primaryKey(),
		eventId: integer("event_id")
			.notNull()
			.references(() => calendarEvent.id, { onDelete: "restrict" }),
		name: text("name").notNull(),
		email: text("email").notNull(),
		phone: text("phone").notNull(),
		message: text("message").notNull(),
		status: requestStatus("status").default("new").notNull(),
		emailFailed: boolean("email_failed").default(false).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		handledAt: timestamp("handled_at"),
	},
	(t) => [index("weekend_request_event_idx").on(t.eventId)],
);
