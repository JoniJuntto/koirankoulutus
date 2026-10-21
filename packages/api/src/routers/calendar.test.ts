// Needs the dev database: `bun run db:start`, then `bun test` in packages/api.
import { afterAll, expect, test } from "bun:test";
import {
	calendarEvent,
	weekendRequest,
} from "@koirankoulutus/db/schema/calendar";
import { eq, inArray } from "drizzle-orm";

import type { Context } from "../context";
import type { Mail } from "../mail";
import { testDb as db, memoryStorage } from "../testing";
import { appRouter } from "./index";

const created: number[] = [];
async function event(values: Partial<typeof calendarEvent.$inferInsert>) {
	const [e] = await db
		.insert(calendarEvent)
		.values({
			kind: "free_weekend",
			startsOn: "2030-06-01",
			endsOn: "2030-06-02",
			...values,
		})
		.returning();
	if (!e) throw new Error("event insert failed");
	created.push(e.id);
	return e;
}

afterAll(async () => {
	await db
		.delete(weekendRequest)
		.where(inArray(weekendRequest.eventId, created));
	await db.delete(calendarEvent).where(inArray(calendarEvent.id, created));
});

let ipCounter = 0;
function caller(opts: { admin?: boolean } = {}) {
	const sent: Mail[] = [];
	const ctx: Context = {
		db,
		session: opts.admin
			? ({ user: { id: "admin" } } as Context["session"])
			: null,
		ip: `test-cal-${ipCounter++}`,
		trainerEmail: "trainer@example.com",
		siteUrl: "http://site.test",
		storage: memoryStorage().storage,
		mailer: {
			async send(mail) {
				sent.push(mail);
			},
		},
	};
	return { api: appRouter.createCaller(ctx), sent };
}

const input = (eventId: number) => ({
	eventId,
	name: "Maija Testaaja",
	email: `maija-${crypto.randomUUID()}@example.com`,
	phone: "040 123 4567",
	message: "Koulutuspäivä seuralle",
	consent: true as const,
});

test("public list hides private details", async () => {
	const e = await event({
		kind: "private",
		startsOn: "2030-03-07",
		endsOn: "2030-03-07",
		location: "Salainen paikka",
		description: "Asiakkaan nimi",
	});
	const list = await caller().api.calendar.list({
		from: "2030-03-01",
		to: "2030-03-31",
	});
	const found = list.find((x) => x.id === e.id);
	expect(found?.title).toBe("Varattu");
	expect(found?.location).toBe("");
	expect(found?.description).toBe("");
	expect(JSON.stringify(list)).not.toContain("Salainen");
});

test("request for a free weekend is saved and emails both", async () => {
	const e = await event({});
	const { api, sent } = caller();
	const data = input(e.id);
	await api.calendar.request(data);
	const rows = await db
		.select()
		.from(weekendRequest)
		.where(eq(weekendRequest.email, data.email));
	expect(rows[0]?.status).toBe("new");
	expect(sent.map((m) => m.to).sort()).toEqual(
		[data.email, "trainer@example.com"].sort(),
	);
});

test("request for a private event or a past weekend is rejected", async () => {
	const priv = await event({ kind: "private" });
	const past = await event({ startsOn: "2020-06-06", endsOn: "2020-06-07" });
	for (const e of [priv, past])
		await expect(caller().api.calendar.request(input(e.id))).rejects.toThrow(
			"ei ole enää vapaana",
		);
});

test("confirm turns the weekend private, a second confirm fails", async () => {
	const e = await event({ title: "Ei saa näkyä" });
	await caller().api.calendar.request(input(e.id));
	await caller().api.calendar.request(input(e.id));
	const reqs = await db
		.select()
		.from(weekendRequest)
		.where(eq(weekendRequest.eventId, e.id));
	const [first, second] = reqs;
	if (!first || !second) throw new Error("requests not saved");

	const { api, sent } = caller({ admin: true });
	await expect(api.calendar.confirm({ id: first.id })).resolves.toEqual({
		emailSent: true,
	});
	expect(sent[0]?.to).toBe(first.email);
	const [after] = await db
		.select()
		.from(calendarEvent)
		.where(eq(calendarEvent.id, e.id));
	expect(after?.kind).toBe("private");
	expect(after?.title).toBe("");

	await expect(api.calendar.confirm({ id: second.id })).rejects.toThrow(
		"ei ole enää vapaana",
	);
	const [stillNew] = await db
		.select()
		.from(weekendRequest)
		.where(eq(weekendRequest.id, second.id));
	expect(stillNew?.status).toBe("new");
});

test("event with requests can't be removed", async () => {
	const e = await event({});
	await caller().api.calendar.request(input(e.id));
	await expect(
		caller({ admin: true }).api.calendar.remove({ id: e.id }),
	).rejects.toThrow("varauspyyntöjä");
});

test("admin procedures reject anonymous callers", async () => {
	await expect(caller().api.calendar.requests()).rejects.toThrow(
		"Authentication required",
	);
});
