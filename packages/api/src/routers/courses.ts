import { media } from "@koirankoulutus/db/schema/cms";
import { course, courseRequest } from "@koirankoulutus/db/schema/courses";
import { TRPCError } from "@trpc/server";
import { asc, eq, sql } from "drizzle-orm";
import z from "zod";

import { pgCode, uniqueSlugError } from "../errors";
import { protectedProcedure, publicProcedure, router } from "../index";
import { courseInput } from "../schemas";

const confirmedCount = sql<number>`(
  select count(*)::int from ${courseRequest}
  where ${courseRequest.courseId} = ${course.id} and ${courseRequest.status} = 'confirmed'
)`;
const newCount = sql<number>`(
  select count(*)::int from ${courseRequest}
  where ${courseRequest.courseId} = ${course.id} and ${courseRequest.status} = 'new'
)`;

export const coursesRouter = router({
	list: publicProcedure.query(({ ctx }) =>
		ctx.db
			.select({
				id: course.id,
				slug: course.slug,
				name: course.name,
				description: course.description,
				targetGroup: course.targetGroup,
				startsOn: course.startsOn,
				schedule: course.schedule,
				sessions: course.sessions,
				platform: course.platform,
				priceCents: course.priceCents,
				maxParticipants: course.maxParticipants,
				imageKey: media.key,
				imageAlt: media.alt,
				confirmed: confirmedCount,
			})
			.from(course)
			.innerJoin(media, eq(media.id, course.imageId))
			.where(eq(course.published, true))
			.orderBy(asc(course.startsOn)),
	),

	adminList: protectedProcedure.query(({ ctx }) =>
		ctx.db
			.select({
				course,
				imageKey: media.key,
				confirmed: confirmedCount,
				pending: newCount,
			})
			.from(course)
			.innerJoin(media, eq(media.id, course.imageId))
			.orderBy(asc(course.startsOn)),
	),

	create: protectedProcedure
		.input(courseInput)
		.mutation(async ({ ctx, input }) => {
			try {
				const [row] = await ctx.db
					.insert(course)
					.values(input)
					.returning({ id: course.id });
				return row;
			} catch (e) {
				throw uniqueSlugError(e);
			}
		}),

	update: protectedProcedure
		.input(courseInput.extend({ id: z.number().int() }))
		.mutation(async ({ ctx, input: { id, ...values } }) => {
			try {
				await ctx.db.update(course).set(values).where(eq(course.id, id));
			} catch (e) {
				throw uniqueSlugError(e);
			}
		}),

	setPublished: protectedProcedure
		.input(z.object({ id: z.number().int(), published: z.boolean() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.update(course)
				.set({ published: input.published })
				.where(eq(course.id, input.id));
		}),

	remove: protectedProcedure
		.input(z.object({ id: z.number().int() }))
		.mutation(async ({ ctx, input }) => {
			try {
				await ctx.db.delete(course).where(eq(course.id, input.id));
			} catch (e) {
				if (pgCode(e) === "23503") {
					throw new TRPCError({
						code: "CONFLICT",
						message:
							"Kurssilla on pyyntöjä, joten sitä ei voi poistaa. Piilota se sen sijaan.",
					});
				}
				throw e;
			}
		}),
});
