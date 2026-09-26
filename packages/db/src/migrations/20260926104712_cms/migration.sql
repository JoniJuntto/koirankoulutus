CREATE TYPE "post_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "dog" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"breed" text DEFAULT '' NOT NULL,
	"age" text DEFAULT '' NOT NULL,
	"titles" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"image_id" uuid,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"key" text NOT NULL UNIQUE,
	"mime" text NOT NULL,
	"alt" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page" (
	"id" serial PRIMARY KEY,
	"slug" text NOT NULL UNIQUE,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"intro" text DEFAULT '' NOT NULL,
	"body" jsonb NOT NULL,
	"hero_image_id" uuid,
	"gallery_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"in_footer" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post" (
	"id" serial PRIMARY KEY,
	"slug" text NOT NULL UNIQUE,
	"title" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"body" jsonb NOT NULL,
	"cover_image_id" uuid,
	"status" "post_status" DEFAULT 'draft'::"post_status" NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "setting" (
	"id" integer PRIMARY KEY DEFAULT 1,
	"data" jsonb NOT NULL,
	CONSTRAINT "setting_single_row" CHECK ("id" = 1)
);
--> statement-breakpoint
ALTER TABLE "course" ADD COLUMN "image_id" uuid;--> statement-breakpoint
-- Existing courses point at bundled photos (apps/web/public/images). Register them as media under
-- seed/<file>; the server uploads the files to S3 on start (seedMedia in apps/server/src/seed.ts).
INSERT INTO "media" ("key", "mime") SELECT DISTINCT 'seed/' || "image", 'image/jpeg' FROM "course" ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE "course" SET "image_id" = "media"."id" FROM "media" WHERE "media"."key" = 'seed/' || "course"."image";--> statement-breakpoint
ALTER TABLE "course" ALTER COLUMN "image_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "course" DROP COLUMN "image";--> statement-breakpoint
ALTER TABLE "dog" ADD CONSTRAINT "dog_image_id_media_id_fkey" FOREIGN KEY ("image_id") REFERENCES "media"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "page" ADD CONSTRAINT "page_hero_image_id_media_id_fkey" FOREIGN KEY ("hero_image_id") REFERENCES "media"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_cover_image_id_media_id_fkey" FOREIGN KEY ("cover_image_id") REFERENCES "media"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "course" ADD CONSTRAINT "course_image_id_media_id_fkey" FOREIGN KEY ("image_id") REFERENCES "media"("id") ON DELETE RESTRICT;