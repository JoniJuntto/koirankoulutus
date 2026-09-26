import { dog, media } from "@koirankoulutus/db/schema/cms";
import { asc, eq, sql } from "drizzle-orm";
import z from "zod";

import { protectedProcedure, publicProcedure, router } from "../index";
import { dogInput } from "../schemas";

export const dogsRouter = router({
	list: publicProcedure.query(({ ctx }) =>
		ctx.db
			.select({ dog, imageKey: media.key, imageAlt: media.alt })
			.from(dog)
			.leftJoin(media, eq(media.id, dog.imageId))
			.orderBy(asc(dog.sort), asc(dog.id)),
	),

	create: protectedProcedure
		.input(dogInput)
		.mutation(async ({ ctx, input }) => {
			await ctx.db.insert(dog).values({
				...input,
				sort: sql`(select coalesce(max(sort), 0) + 1 from dog)`,
			});
		}),

	update: protectedProcedure
		.input(dogInput.extend({ id: z.number().int() }))
		.mutation(async ({ ctx, input: { id, ...values } }) => {
			await ctx.db.update(dog).set(values).where(eq(dog.id, id));
		}),

	remove: protectedProcedure
		.input(z.object({ id: z.number().int() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db.delete(dog).where(eq(dog.id, input.id));
		}),

	// Ids in the new display order.
	reorder: protectedProcedure
		.input(z.object({ ids: z.array(z.number().int()).max(200) }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db.transaction(async (tx) => {
				for (const [i, id] of input.ids.entries())
					await tx.update(dog).set({ sort: i }).where(eq(dog.id, id));
			});
		}),
});
