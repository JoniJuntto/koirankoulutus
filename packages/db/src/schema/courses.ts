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
	uuid,
} from "drizzle-orm/pg-core";

import { media } from "./cms";

export const course = pgTable("course", {
	id: serial("id").primaryKey(),
	slug: text("slug").notNull().unique(),
	name: text("name").notNull(),
	description: text("description").notNull(),
	targetGroup: text("target_group").notNull(),
	startsOn: date("starts_on").notNull(),
	schedule: text("schedule").notNull(),
	sessions: integer("sessions").notNull(),
	platform: text("platform").notNull(),
	priceCents: integer("price_cents").notNull(),
	maxParticipants: integer("max_participants").notNull(),
	imageId: uuid("image_id")
		.notNull()
		.references(() => media.id, { onDelete: "restrict" }),
	published: boolean("published").default(true).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const requestStatus = pgEnum("request_status", [
	"new",
	"confirmed",
	"declined",
]);

export const courseRequest = pgTable(
	"course_request",
	{
		id: serial("id").primaryKey(),
		courseId: integer("course_id")
			.notNull()
			.references(() => course.id, { onDelete: "restrict" }),
		name: text("name").notNull(),
		email: text("email").notNull(),
		phone: text("phone").notNull(),
		dogName: text("dog_name").notNull(),
		dogBreed: text("dog_breed").notNull(),
		dogAge: text("dog_age").notNull(),
		message: text("message").notNull().default(""),
		status: requestStatus("status").default("new").notNull(),
		emailFailed: boolean("email_failed").default(false).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		handledAt: timestamp("handled_at"),
	},
	(t) => [index("course_request_course_idx").on(t.courseId)],
);
