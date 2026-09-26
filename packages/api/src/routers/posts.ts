import { media, post } from "@koirankoulutus/db/schema/cms";
import { and, desc, eq, lte } from "drizzle-orm";
import z from "zod";

import { notFound, uniqueSlugError } from "../errors";
import { protectedProcedure, publicProcedure, router } from "../index";
import { postInput } from "../schemas";
import { uniqueSlug } from "../slug";

// Published and not scheduled for later. Compared with a JS date (stored as UTC like every
// `timestamp` here), not now(), so the DB session time zone doesn't matter.
const isLive = () =>
	and(eq(post.status, "published"), lte(post.publishedAt, new Date()));

const card = {
	id: post.id,
	slug: post.slug,
	title: post.title,
	excerpt: post.excerpt,
	publishedAt: post.publishedAt,
	coverKey: media.key,
	coverAlt: media.alt,
};

// Publishing without a date means "now", once: later saves keep the first publish date, and going
// back to draft keeps it too, so re-publishing doesn't bump an old post to the top.
function publishedAt(
	input: z.output<typeof postInput>,
	previous: Date | null = null,
) {
	if (input.publishedAt) return new Date(input.publishedAt);
	if (previous) return previous;
	return input.status === "published" ? new Date() : null;
}

export const postsRouter = router({
	list: publicProcedure
		.input(z.object({ limit: z.number().int().min(1).max(100).default(100) }))
		.query(({ ctx, input }) =>
			ctx.db
				.select(card)
				.from(post)
				.leftJoin(media, eq(media.id, post.coverImageId))
				.where(isLive())
				.orderBy(desc(post.publishedAt))
				.limit(input.limit),
		),

	get: publicProcedure
		.input(z.object({ slug: z.string().max(80) }))
		.query(async ({ ctx, input }) => {
			const [row] = await ctx.db
				.select({ ...card, body: post.body })
				.from(post)
				.leftJoin(media, eq(media.id, post.coverImageId))
				.where(and(eq(post.slug, input.slug), isLive()));
			return row ?? null;
		}),

	adminList: protectedProcedure.query(({ ctx }) =>
		ctx.db
			.select({
				id: post.id,
				slug: post.slug,
				title: post.title,
				status: post.status,
				publishedAt: post.publishedAt,
				updatedAt: post.updatedAt,
			})
			.from(post)
			.orderBy(desc(post.createdAt)),
	),

	adminGet: protectedProcedure
		.input(z.object({ id: z.number().int() }))
		.query(async ({ ctx, input }) => {
			const [row] = await ctx.db
				.select({ post, coverKey: media.key, coverAlt: media.alt })
				.from(post)
				.leftJoin(media, eq(media.id, post.coverImageId))
				.where(eq(post.id, input.id));
			if (!row) throw notFound("Kirjoitusta ei löytynyt.");
			return row;
		}),

	create: protectedProcedure
		.input(postInput)
		.mutation(async ({ ctx, input }) => {
			const slug = input.slug || (await uniqueSlug(ctx.db, post, input.title));
			try {
				const [row] = await ctx.db
					.insert(post)
					.values({ ...input, slug, publishedAt: publishedAt(input) })
					.returning({ id: post.id, slug: post.slug });
				return row;
			} catch (e) {
				throw uniqueSlugError(e);
			}
		}),

	update: protectedProcedure
		.input(postInput.extend({ id: z.number().int() }))
		.mutation(async ({ ctx, input: { id, ...values } }) => {
			const [existing] = await ctx.db
				.select({ slug: post.slug, publishedAt: post.publishedAt })
				.from(post)
				.where(eq(post.id, id));
			if (!existing) throw notFound("Kirjoitusta ei löytynyt.");
			try {
				await ctx.db
					.update(post)
					.set({
						...values,
						// The slug never changes on its own, so shared links keep working.
						slug: values.slug || existing.slug,
						publishedAt: publishedAt(values, existing.publishedAt),
						updatedAt: new Date(),
					})
					.where(eq(post.id, id));
			} catch (e) {
				throw uniqueSlugError(e);
			}
		}),

	remove: protectedProcedure
		.input(z.object({ id: z.number().int() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db.delete(post).where(eq(post.id, input.id));
		}),
});
