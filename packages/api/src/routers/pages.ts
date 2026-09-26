import type { Database } from "@koirankoulutus/db";
import { media, page } from "@koirankoulutus/db/schema/cms";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, notInArray } from "drizzle-orm";
import z from "zod";

import { notFound, uniqueSlugError } from "../errors";
import { protectedProcedure, publicProcedure, router } from "../index";
import { pageInput } from "../schemas";
import { uniqueSlug } from "../slug";

// Pages with their own route and layout in apps/web. Their slug is fixed and they can't be deleted.
export const SYSTEM_PAGES = ["meista", "yhteystiedot", "ehdot"] as const;
const isSystem = (slug: string) =>
	(SYSTEM_PAGES as readonly string[]).includes(slug);

// Top-level paths the site already uses; a custom page at /<slug> can't take them.
const RESERVED = new Set([
	...SYSTEM_PAGES,
	"kurssit",
	"blogi",
	"admin",
	"media",
	"share",
	"api",
	"trpc",
]);

function checkSlug(slug: string) {
	if (RESERVED.has(slug))
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Osoite /${slug} on jo sivuston käytössä. Valitse toinen.`,
		});
}

const heroMedia = {
	heroKey: media.key,
	heroAlt: media.alt,
};

async function galleryFor(db: Database, ids: string[]) {
	if (!ids.length) return [];
	const rows = await db.select().from(media).where(inArray(media.id, ids));
	const byId = new Map(rows.map((r) => [r.id, r]));
	return ids.flatMap((id) => byId.get(id) ?? []);
}

export const pagesRouter = router({
	get: publicProcedure
		.input(z.object({ slug: z.string().max(80) }))
		.query(async ({ ctx, input }) => {
			const [row] = await ctx.db
				.select({ page, ...heroMedia })
				.from(page)
				.leftJoin(media, eq(media.id, page.heroImageId))
				.where(and(eq(page.slug, input.slug), eq(page.published, true)));
			if (!row) return null;
			return {
				...row,
				gallery: await galleryFor(ctx.db, row.page.galleryIds),
			};
		}),

	footerList: publicProcedure.query(({ ctx }) =>
		ctx.db
			.select({ slug: page.slug, title: page.title })
			.from(page)
			.where(
				and(
					eq(page.published, true),
					eq(page.inFooter, true),
					notInArray(page.slug, [...SYSTEM_PAGES]),
				),
			)
			.orderBy(asc(page.title)),
	),

	adminList: protectedProcedure.query(({ ctx }) =>
		ctx.db
			.select({
				id: page.id,
				slug: page.slug,
				title: page.title,
				published: page.published,
				updatedAt: page.updatedAt,
			})
			.from(page)
			.orderBy(asc(page.id)),
	),

	adminGet: protectedProcedure
		.input(z.object({ id: z.number().int() }))
		.query(async ({ ctx, input }) => {
			const [row] = await ctx.db
				.select()
				.from(page)
				.where(eq(page.id, input.id));
			if (!row) throw notFound("Sivua ei löytynyt.");
			return { ...row, system: isSystem(row.slug) };
		}),

	create: protectedProcedure
		.input(pageInput)
		.mutation(async ({ ctx, input }) => {
			const slug =
				input.slug || (await uniqueSlug(ctx.db, page, input.title, RESERVED));
			checkSlug(slug);
			try {
				const [row] = await ctx.db
					.insert(page)
					.values({ ...input, slug })
					.returning({ id: page.id, slug: page.slug });
				return row;
			} catch (e) {
				throw uniqueSlugError(e);
			}
		}),

	update: protectedProcedure
		.input(pageInput.extend({ id: z.number().int() }))
		.mutation(async ({ ctx, input: { id, ...values } }) => {
			const [existing] = await ctx.db
				.select({ slug: page.slug })
				.from(page)
				.where(eq(page.id, id));
			if (!existing) throw notFound("Sivua ei löytynyt.");
			const system = isSystem(existing.slug);
			const slug = system ? existing.slug : values.slug || existing.slug;
			if (!system && slug !== existing.slug) checkSlug(slug);
			try {
				await ctx.db
					.update(page)
					.set({
						...values,
						slug,
						// A system page can't be hidden: its route would 404.
						published: system ? true : values.published,
						inFooter: system ? false : values.inFooter,
						updatedAt: new Date(),
					})
					.where(eq(page.id, id));
				return { slug };
			} catch (e) {
				throw uniqueSlugError(e);
			}
		}),

	remove: protectedProcedure
		.input(z.object({ id: z.number().int() }))
		.mutation(async ({ ctx, input }) => {
			const [existing] = await ctx.db
				.select({ slug: page.slug })
				.from(page)
				.where(eq(page.id, input.id));
			if (!existing) throw notFound("Sivua ei löytynyt.");
			if (isSystem(existing.slug))
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"Tätä sivua ei voi poistaa, mutta voit muokata sen sisältöä.",
				});
			await ctx.db.delete(page).where(eq(page.id, input.id));
		}),
});
