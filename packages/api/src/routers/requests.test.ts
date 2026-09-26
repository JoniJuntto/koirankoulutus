// Needs the dev database: `bun run db:start`, then `bun test` in packages/api.
import { afterAll, expect, test } from "bun:test";
import { media } from "@koirankoulutus/db/schema/cms";
import { course, courseRequest } from "@koirankoulutus/db/schema/courses";
import { eq } from "drizzle-orm";

import type { Context } from "../context";
import type { Mail } from "../mail";
import { testDb as db, memoryStorage } from "../testing";
import { appRouter } from "./index";

const [testImage] = await db
	.insert(media)
	.values({ key: `test/${crypto.randomUUID()}.jpg`, mime: "image/jpeg" })
	.returning();
if (!testImage) throw new Error("media insert failed");

const [testCourse] = await db
	.insert(course)
	.values({
		slug: `test-${crypto.randomUUID()}`,
		name: "Testikurssi",
		description: "Testikurssin kuvaus",
		targetGroup: "Testaajat",
		startsOn: "2030-01-01",
		schedule: "ma klo 18",
		sessions: 1,
		platform: "Zoom",
		priceCents: 1000,
		maxParticipants: 5,
		imageId: testImage.id,
	})
	.returning();
if (!testCourse) throw new Error("course insert failed");

afterAll(async () => {
	await db
		.delete(courseRequest)
		.where(eq(courseRequest.courseId, testCourse.id));
	await db.delete(course).where(eq(course.id, testCourse.id));
	await db.delete(media).where(eq(media.id, testImage.id));
});

let ipCounter = 0;
function caller(opts: { failMail?: boolean; admin?: boolean } = {}) {
	const sent: Mail[] = [];
	const ctx: Context = {
		db,
		session: opts.admin
			? ({ user: { id: "admin" } } as Context["session"])
			: null,
		ip: `test-${ipCounter++}`,
		trainerEmail: "trainer@example.com",
		siteUrl: "http://site.test",
		storage: memoryStorage().storage,
		mailer: {
			async send(mail) {
				if (opts.failMail) throw new Error("smtp down");
				sent.push(mail);
			},
		},
	};
	return { api: appRouter.createCaller(ctx), sent };
}

const input = () => ({
	courseId: testCourse.id,
	name: "Maija Testaaja",
	email: `maija-${crypto.randomUUID()}@example.com`,
	phone: "040 123 4567",
	dogName: "Musti",
	dogBreed: "Sekarotu",
	dogAge: "2 v",
	message: "",
	consent: true as const,
});

const rowsFor = (email: string) =>
	db.select().from(courseRequest).where(eq(courseRequest.email, email));

test("valid request is saved and emails trainer + customer", async () => {
	const { api, sent } = caller();
	const data = input();
	await api.requests.create(data);
	const [row] = await rowsFor(data.email);
	expect(row?.status).toBe("new");
	expect(row?.emailFailed).toBe(false);
	expect(sent.map((m) => m.to).sort()).toEqual(
		[data.email, "trainer@example.com"].sort(),
	);
});

test("failed email still saves the request, flagged", async () => {
	const { api } = caller({ failMail: true });
	const data = input();
	await expect(api.requests.create(data)).resolves.toEqual({ ok: true });
	const [row] = await rowsFor(data.email);
	expect(row?.emailFailed).toBe(true);
});

test("filled honeypot saves nothing but looks successful", async () => {
	const { api, sent } = caller();
	const data = input();
	await expect(
		api.requests.create({ ...data, website: "http://spam" }),
	).resolves.toEqual({ ok: true });
	expect(await rowsFor(data.email)).toHaveLength(0);
	expect(sent).toHaveLength(0);
});

test("confirm changes status and emails the customer", async () => {
	const data = input();
	await caller().api.requests.create(data);
	const [row] = await rowsFor(data.email);
	if (!row) throw new Error("request not saved");
	const { api, sent } = caller({ admin: true });
	await expect(
		api.requests.confirm({ id: row.id, note: "Tervetuloa" }),
	).resolves.toEqual({ emailSent: true });
	const [after] = await rowsFor(data.email);
	expect(after?.status).toBe("confirmed");
	expect(sent[0]?.to).toBe(data.email);
	expect(sent[0]?.text).toContain("Tervetuloa");
});

test("admin procedures reject anonymous callers", async () => {
	await expect(caller().api.requests.list({})).rejects.toThrow(
		"Authentication required",
	);
});
