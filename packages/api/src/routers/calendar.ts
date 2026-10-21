import {
	calendarEvent,
	weekendRequest,
} from "@koirankoulutus/db/schema/calendar";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, lte, ne, or, sql } from "drizzle-orm";
import z from "zod";

import type { Context } from "../context";
import { isReferenced, notFound } from "../errors";
import { dateRange, today } from "../format";
import { protectedProcedure, publicProcedure, router } from "../index";
import { isRateLimited } from "../rate-limit";
import { calendarEventInput, weekendRequestInput } from "../schemas";
import { signature } from "./requests";

type Event = typeof calendarEvent.$inferSelect;

const pendingCount = sql<number>`(
  select count(*)::int from ${weekendRequest}
  where ${weekendRequest.eventId} = ${calendarEvent.id} and ${weekendRequest.status} = 'new'
)`;

const byId = z.object({ id: z.number().int() });
const decision = z.object({
	id: z.number().int(),
	note: z.string().trim().max(2000).default(""),
});

export const calendarRouter = router({
	list: publicProcedure
		.input(z.object({ from: z.iso.date(), to: z.iso.date() }))
		.query(async ({ ctx, input }) => {
			const rows = await ctx.db
				.select()
				.from(calendarEvent)
				.where(
					and(
						lte(calendarEvent.startsOn, input.to),
						gte(calendarEvent.endsOn, input.from),
						// Past free weekends can't be booked, so don't show them as free.
						or(
							ne(calendarEvent.kind, "free_weekend"),
							gte(calendarEvent.endsOn, today()),
						),
					),
				)
				.orderBy(asc(calendarEvent.startsOn));
			// Private details never leave the server, only the dates and the public label.
			return rows.map((e) =>
				e.kind === "private"
					? {
							id: e.id,
							kind: e.kind,
							title: e.title || "Varattu",
							startsOn: e.startsOn,
							endsOn: e.endsOn,
							time: "",
							location: "",
							description: "",
							link: "",
						}
					: {
							id: e.id,
							kind: e.kind,
							title: e.kind === "free_weekend" ? "Vapaa viikonloppu" : e.title,
							startsOn: e.startsOn,
							endsOn: e.endsOn,
							time: e.time,
							location: e.location,
							description: e.description,
							link: e.link,
						},
			);
		}),

	// For the booking form: only bookable weekends.
	freeWeekend: publicProcedure.input(byId).query(async ({ ctx, input }) => {
		const [e] = await ctx.db
			.select()
			.from(calendarEvent)
			.where(
				and(
					eq(calendarEvent.id, input.id),
					eq(calendarEvent.kind, "free_weekend"),
					gte(calendarEvent.endsOn, today()),
				),
			);
		return e
			? {
					id: e.id,
					startsOn: e.startsOn,
					endsOn: e.endsOn,
					description: e.description,
				}
			: null;
	}),

	adminList: protectedProcedure.query(({ ctx }) =>
		ctx.db
			.select({ event: calendarEvent, pending: pendingCount })
			.from(calendarEvent)
			.orderBy(asc(calendarEvent.startsOn)),
	),

	create: protectedProcedure
		.input(calendarEventInput)
		.mutation(async ({ ctx, input }) => {
			const [row] = await ctx.db
				.insert(calendarEvent)
				.values(input)
				.returning({ id: calendarEvent.id });
			return row;
		}),

	update: protectedProcedure
		.input(calendarEventInput.safeExtend({ id: z.number().int() }))
		.mutation(async ({ ctx, input: { id, ...values } }) => {
			await ctx.db
				.update(calendarEvent)
				.set(values)
				.where(eq(calendarEvent.id, id));
		}),

	remove: protectedProcedure.input(byId).mutation(async ({ ctx, input }) => {
		try {
			await ctx.db.delete(calendarEvent).where(eq(calendarEvent.id, input.id));
		} catch (e) {
			if (isReferenced(e)) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"Merkintään liittyy varauspyyntöjä. Poista pyynnöt ensin, jos haluat poistaa merkinnän.",
				});
			}
			throw e;
		}
	}),

	request: publicProcedure
		.input(weekendRequestInput)
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

			const [e] = await ctx.db
				.select()
				.from(calendarEvent)
				.where(eq(calendarEvent.id, values.eventId));
			if (e?.kind !== "free_weekend" || e.endsOn < today())
				throw new TRPCError({
					code: "CONFLICT",
					message: "Viikonloppu ei ole enää vapaana.",
				});

			const [row] = await ctx.db
				.insert(weekendRequest)
				.values(values)
				.returning({ id: weekendRequest.id });
			if (!row) throw new Error("insert failed");

			// The request is already saved; a failed email only sets a flag the trainer sees in admin.
			const results = await Promise.allSettled([
				ctx.mailer.send({
					to: ctx.trainerEmail,
					replyTo: values.email,
					subject: `Uusi varauspyyntö: ${dateRange(e)}`,
					text: [
						`Uusi varauspyyntö vapaalle viikonlopulle ${dateRange(e)}.`,
						"",
						`Nimi: ${values.name}`,
						`Sähköposti: ${values.email}`,
						`Puhelin: ${values.phone}`,
						"",
						`Viesti:\n${values.message}`,
						"",
						`Vahvista tai hylkää: ${ctx.siteUrl}/admin/kalenteri`,
					].join("\n"),
				}),
				ctx.mailer.send({
					to: values.email,
					subject: `Varauspyyntösi on vastaanotettu: ${dateRange(e)}`,
					text: [
						`Hei ${values.name},`,
						"",
						`kiitos pyynnöstäsi ajalle ${dateRange(e)}! Olen saanut sen ja vastaan sähköpostilla mahdollisimman pian.`,
						"",
						signature,
					].join("\n"),
				}),
			]);
			const failed = results.filter((r) => r.status === "rejected");
			if (failed.length) {
				console.error("weekend request email failed", failed);
				await ctx.db
					.update(weekendRequest)
					.set({ emailFailed: true })
					.where(eq(weekendRequest.id, row.id));
			}
			return { ok: true };
		}),

	requests: protectedProcedure.query(({ ctx }) =>
		ctx.db
			.select({ request: weekendRequest, event: calendarEvent })
			.from(weekendRequest)
			.innerJoin(calendarEvent, eq(calendarEvent.id, weekendRequest.eventId))
			.orderBy(desc(weekendRequest.createdAt)),
	),

	confirm: protectedProcedure.input(decision).mutation(({ ctx, input }) =>
		decide(ctx, input.id, "confirmed", (r, e) => ({
			subject: `Varauksesi on vahvistettu: ${dateRange(e)}`,
			text: [
				`Hei ${r.name},`,
				"",
				`ilolla vahvistan varauksesi ajalle ${dateRange(e)}.`,
				input.note ? `\n${input.note}\n` : "",
				signature,
			].join("\n"),
		})),
	),

	decline: protectedProcedure.input(decision).mutation(({ ctx, input }) =>
		decide(ctx, input.id, "declined", (r, e) => ({
			subject: `Varauspyyntösi: ${dateRange(e)}`,
			text: [
				`Hei ${r.name},`,
				"",
				`kiitos pyynnöstäsi. Valitettavasti en pysty ottamaan varausta ajalle ${dateRange(e)}.`,
				input.note ? `\n${input.note}\n` : "",
				`Muut vapaat ajat löydät osoitteesta ${ctx.siteUrl}/kalenteri`,
				"",
				signature,
			].join("\n"),
		})),
	),

	removeRequest: protectedProcedure
		.input(byId)
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.delete(weekendRequest)
				.where(eq(weekendRequest.id, input.id));
		}),
});

async function decide(
	ctx: Context,
	id: number,
	status: "confirmed" | "declined",
	email: (
		r: typeof weekendRequest.$inferSelect,
		e: Event,
	) => { subject: string; text: string },
) {
	const [row] = await ctx.db
		.select({ request: weekendRequest, event: calendarEvent })
		.from(weekendRequest)
		.innerJoin(calendarEvent, eq(calendarEvent.id, weekendRequest.eventId))
		.where(eq(weekendRequest.id, id));
	if (!row) throw notFound("Pyyntöä ei löytynyt.");

	await ctx.db.transaction(async (tx) => {
		if (status === "confirmed") {
			// The weekend becomes a private booking ("Varattu"). The where clause makes
			// a second confirmation for the same weekend fail instead of double-booking.
			const booked = await tx
				.update(calendarEvent)
				.set({ kind: "private", title: "" })
				.where(
					and(
						eq(calendarEvent.id, row.event.id),
						eq(calendarEvent.kind, "free_weekend"),
					),
				)
				.returning({ id: calendarEvent.id });
			if (!booked.length)
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"Viikonloppu ei ole enää vapaana. Hylkää pyyntö tai muuta merkintä ensin vapaaksi viikonlopuksi.",
				});
		}
		await tx
			.update(weekendRequest)
			.set({ status, handledAt: new Date() })
			.where(eq(weekendRequest.id, id));
	});

	try {
		await ctx.mailer.send({
			to: row.request.email,
			replyTo: ctx.trainerEmail,
			...email(row.request, row.event),
		});
		return { emailSent: true };
	} catch (e) {
		console.error("decision email failed", e);
		return { emailSent: false };
	}
}
