import { course, courseRequest } from "@koirankoulutus/db/schema/courses";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import z from "zod";

import type { Context } from "../context";
import { formatDate } from "../format";
import { protectedProcedure, publicProcedure, router } from "../index";
import { isRateLimited } from "../rate-limit";
import { courseRequestInput } from "../schemas";

type CourseInfo = typeof course.$inferSelect;

const courseLines = (c: CourseInfo) =>
	[
		`Kurssi: ${c.name}`,
		`Alkaa: ${formatDate(c.startsOn)}`,
		`Aika: ${c.schedule}, ${c.sessions} kertaa`,
		`Alusta: ${c.platform}`,
	].join("\n");

const signature =
	"Ystävällisin terveisin\nTeija Tarkkanen\nkoirankoulutus Nyt ja Tässä";

export const requestsRouter = router({
	create: publicProcedure
		.input(courseRequestInput)
		.mutation(async ({ ctx, input }) => {
			const { website, consent: _consent, ...values } = input;
			// Pretend success so bots don't learn to skip the honeypot.
			if (website) return { ok: true };

			if (isRateLimited(`request:${ctx.ip}`, 5, 10 * 60_000)) {
				throw new TRPCError({
					code: "TOO_MANY_REQUESTS",
					message: "Liian monta pyyntöä. Yritä hetken päästä uudelleen.",
				});
			}

			const [c] = await ctx.db
				.select()
				.from(course)
				.where(and(eq(course.id, values.courseId), eq(course.published, true)));
			if (!c)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Kurssia ei löytynyt.",
				});

			const [row] = await ctx.db
				.insert(courseRequest)
				.values(values)
				.returning({ id: courseRequest.id });
			if (!row) throw new Error("insert failed");

			// The request is already saved; a failed email only sets a flag the trainer sees in admin.
			const results = await Promise.allSettled([
				ctx.mailer.send({
					to: ctx.trainerEmail,
					replyTo: values.email,
					subject: `Uusi kurssipyyntö: ${c.name}`,
					text: [
						`Uusi pyyntö kurssille ${c.name}.`,
						"",
						`Nimi: ${values.name}`,
						`Sähköposti: ${values.email}`,
						`Puhelin: ${values.phone}`,
						`Koira: ${values.dogName}, ${values.dogBreed}, ${values.dogAge}`,
						"",
						values.message ? `Viesti:\n${values.message}\n` : "",
						`Vahvista tai hylkää: ${ctx.siteUrl}/admin`,
					].join("\n"),
				}),
				ctx.mailer.send({
					to: values.email,
					subject: `Pyyntösi on vastaanotettu: ${c.name}`,
					text: [
						`Hei ${values.name},`,
						"",
						"kiitos pyynnöstäsi! Olen saanut sen ja vahvistan paikkasi sähköpostilla mahdollisimman pian.",
						"",
						courseLines(c),
						"",
						signature,
					].join("\n"),
				}),
			]);
			const failed = results.filter((r) => r.status === "rejected");
			if (failed.length) {
				console.error("course request email failed", failed);
				await ctx.db
					.update(courseRequest)
					.set({ emailFailed: true })
					.where(eq(courseRequest.id, row.id));
			}
			return { ok: true };
		}),

	list: protectedProcedure
		.input(
			z.object({
				status: z.enum(["new", "confirmed", "declined"]).optional(),
				courseId: z.number().int().optional(),
			}),
		)
		.query(({ ctx, input }) =>
			ctx.db
				.select({ request: courseRequest, courseName: course.name })
				.from(courseRequest)
				.innerJoin(course, eq(course.id, courseRequest.courseId))
				.where(
					and(
						input.status ? eq(courseRequest.status, input.status) : undefined,
						input.courseId
							? eq(courseRequest.courseId, input.courseId)
							: undefined,
					),
				)
				.orderBy(desc(courseRequest.createdAt)),
		),

	confirm: protectedProcedure
		.input(
			z.object({
				id: z.number().int(),
				note: z.string().trim().max(2000).default(""),
			}),
		)
		.mutation(({ ctx, input }) =>
			decide(ctx, input.id, "confirmed", (r, c) => ({
				subject: `Paikkasi on vahvistettu: ${c.name}`,
				text: [
					`Hei ${r.name},`,
					"",
					`ilolla vahvistan paikkasi kurssille ${c.name} (koira ${r.dogName}).`,
					"",
					courseLines(c),
					"",
					"Lähetän laskun ja liittymislinkin erikseen ennen kurssin alkua.",
					input.note ? `\n${input.note}\n` : "",
					signature,
				].join("\n"),
			})),
		),

	decline: protectedProcedure
		.input(
			z.object({
				id: z.number().int(),
				note: z.string().trim().max(2000).default(""),
			}),
		)
		.mutation(({ ctx, input }) =>
			decide(ctx, input.id, "declined", (r, c) => ({
				subject: `Kurssipyyntösi: ${c.name}`,
				text: [
					`Hei ${r.name},`,
					"",
					`kiitos kiinnostuksestasi kurssia ${c.name} kohtaan. Valitettavasti en pysty tarjoamaan paikkaa tälle kurssille.`,
					input.note ? `\n${input.note}\n` : "",
					`Tulevat kurssit löydät osoitteesta ${ctx.siteUrl}/kurssit`,
					"",
					signature,
				].join("\n"),
			})),
		),

	remove: protectedProcedure
		.input(z.object({ id: z.number().int() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db.delete(courseRequest).where(eq(courseRequest.id, input.id));
		}),
});

async function decide(
	ctx: Context,
	id: number,
	status: "confirmed" | "declined",
	email: (
		r: typeof courseRequest.$inferSelect,
		c: CourseInfo,
	) => { subject: string; text: string },
) {
	const [row] = await ctx.db
		.select({ request: courseRequest, course })
		.from(courseRequest)
		.innerJoin(course, eq(course.id, courseRequest.courseId))
		.where(eq(courseRequest.id, id));
	if (!row)
		throw new TRPCError({ code: "NOT_FOUND", message: "Pyyntöä ei löytynyt." });

	await ctx.db
		.update(courseRequest)
		.set({ status, handledAt: new Date() })
		.where(eq(courseRequest.id, id));

	try {
		await ctx.mailer.send({
			to: row.request.email,
			replyTo: ctx.trainerEmail,
			...email(row.request, row.course),
		});
		return { emailSent: true };
	} catch (e) {
		console.error("decision email failed", e);
		return { emailSent: false };
	}
}
