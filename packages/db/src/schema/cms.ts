import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

// Tiptap/ProseMirror document. Validated and cleaned in packages/api/src/rich-text.ts before it's stored.
export type RichTextDoc = { type: "doc"; content?: unknown[] };

// The file itself lives in S3 (MinIO) under `key`; served at /media/<key>.
export const media = pgTable("media", {
	id: uuid("id").primaryKey().defaultRandom(),
	key: text("key").notNull().unique(),
	mime: text("mime").notNull(),
	alt: text("alt").notNull().default(""),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

const imageRef = (name: string) =>
	uuid(name).references(() => media.id, { onDelete: "restrict" });

export const page = pgTable("page", {
	id: serial("id").primaryKey(),
	slug: text("slug").notNull().unique(),
	title: text("title").notNull(),
	description: text("description").notNull().default(""),
	intro: text("intro").notNull().default(""),
	body: jsonb("body").$type<RichTextDoc>().notNull(),
	heroImageId: imageRef("hero_image_id"),
	galleryIds: uuid("gallery_ids").array().notNull().default(sql`'{}'`),
	inFooter: boolean("in_footer").default(false).notNull(),
	published: boolean("published").default(true).notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const postStatus = pgEnum("post_status", ["draft", "published"]);

export const post = pgTable("post", {
	id: serial("id").primaryKey(),
	slug: text("slug").notNull().unique(),
	title: text("title").notNull(),
	excerpt: text("excerpt").notNull().default(""),
	body: jsonb("body").$type<RichTextDoc>().notNull(),
	coverImageId: imageRef("cover_image_id"),
	status: postStatus("status").default("draft").notNull(),
	publishedAt: timestamp("published_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const dog = pgTable("dog", {
	id: serial("id").primaryKey(),
	name: text("name").notNull(),
	breed: text("breed").notNull().default(""),
	age: text("age").notNull().default(""),
	titles: text("titles").notNull().default(""),
	note: text("note").notNull().default(""),
	imageId: imageRef("image_id"),
	sort: integer("sort").notNull().default(0),
});

export type SiteSettings = {
	phone: string;
	email: string;
	businessId: string;
	facebook: string;
	footerText: string;
	defaultDescription: string;
};

// Single row (id = 1).
export const setting = pgTable(
	"setting",
	{
		id: integer("id").primaryKey().default(1),
		data: jsonb("data").$type<SiteSettings>().notNull(),
	},
	(t) => [check("setting_single_row", sql`${t.id} = 1`)],
);
