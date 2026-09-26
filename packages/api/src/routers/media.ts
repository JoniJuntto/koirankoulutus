import type { Database } from "@koirankoulutus/db";
import { dog, media, page, post } from "@koirankoulutus/db/schema/cms";
import { course } from "@koirankoulutus/db/schema/courses";
import { TRPCError } from "@trpc/server";
import { desc, eq, or, sql } from "drizzle-orm";
import z from "zod";

import { notFound } from "../errors";
import { mediaUrl } from "../format";
import { protectedProcedure, router } from "../index";

// Where a photo is used, in words for the admin ("kurssissa X"), or null if unused.
export async function mediaUsage(db: Database, id: string, key: string) {
	// Rich text stores the URL; the JSON string contains it verbatim.
	const inBody = (col: typeof page.body | typeof post.body) =>
		sql`strpos(${col}::text, ${JSON.stringify(mediaUrl(key))}) > 0`;
	const [c] = await db
		.select({ name: course.name })
		.from(course)
		.where(eq(course.imageId, id))
		.limit(1);
	if (c) return `kurssissa "${c.name}"`;
	const [p] = await db
		.select({ title: page.title })
		.from(page)
		.where(
			or(
				eq(page.heroImageId, id),
				sql`${id}::uuid = any(${page.galleryIds})`,
				inBody(page.body),
			),
		)
		.limit(1);
	if (p) return `sivulla "${p.title}"`;
	const [b] = await db
		.select({ title: post.title })
		.from(post)
		.where(or(eq(post.coverImageId, id), inBody(post.body)))
		.limit(1);
	if (b) return `kirjoituksessa "${b.title}"`;
	const [d] = await db
		.select({ name: dog.name })
		.from(dog)
		.where(eq(dog.imageId, id))
		.limit(1);
	if (d) return `koiran "${d.name}" kuvana`;
	return null;
}

export const mediaRouter = router({
	list: protectedProcedure.query(({ ctx }) =>
		ctx.db.select().from(media).orderBy(desc(media.createdAt), media.key),
	),

	updateAlt: protectedProcedure
		.input(z.object({ id: z.uuid(), alt: z.string().trim().max(300) }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.update(media)
				.set({ alt: input.alt })
				.where(eq(media.id, input.id));
		}),

	remove: protectedProcedure
		.input(z.object({ id: z.uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [row] = await ctx.db
				.select()
				.from(media)
				.where(eq(media.id, input.id));
			if (!row) throw notFound("Kuvaa ei löytynyt.");
			const usage = await mediaUsage(ctx.db, row.id, row.key);
			if (usage)
				throw new TRPCError({
					code: "CONFLICT",
					message: `Kuva on käytössä ${usage}, joten sitä ei voi poistaa. Vaihda ensin toinen kuva sinne.`,
				});
			// Row first: a leftover object is harmless, a row without its file is a broken image.
			await ctx.db.delete(media).where(eq(media.id, row.id));
			await ctx.storage.delete(row.key).catch((e) => {
				console.error("media object delete failed", row.key, e);
			});
		}),
});
