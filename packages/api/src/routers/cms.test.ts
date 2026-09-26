// Needs the dev database: `bun run db:start`, then `bun test` in packages/api.
import { afterAll, expect, test } from "bun:test";
import { media, page, post } from "@koirankoulutus/db/schema/cms";
import { eq, inArray, like } from "drizzle-orm";

import type { Context } from "../context";
import { UploadError, uploadMedia } from "../media";
import { cleanDoc } from "../rich-text";
import { testDb as db, memoryStorage } from "../testing";
import { appRouter } from "./index";

const run = crypto.randomUUID().slice(0, 8);
const createdMedia: string[] = [];

afterAll(async () => {
	await db.delete(post).where(like(post.title, `%${run}%`));
	await db.delete(page).where(like(page.title, `%${run}%`));
	if (createdMedia.length)
		await db.delete(media).where(inArray(media.id, createdMedia));
});

function caller(admin = true) {
	const mem = memoryStorage();
	const ctx: Context = {
		db,
		session: admin ? ({ user: { id: "admin" } } as Context["session"]) : null,
		ip: "test",
		trainerEmail: "trainer@example.com",
		siteUrl: "http://site.test",
		mailer: { async send() {} },
		storage: mem.storage,
	};
	return { api: appRouter.createCaller(ctx), ...mem, ctx };
}

const doc = (...content: unknown[]) => ({ type: "doc", content });
const p = (text: string, marks?: unknown[]) => ({
	type: "paragraph",
	content: [{ type: "text", text, marks }],
});

const postInput = (title: string, extra: Record<string, unknown> = {}) => ({
	title,
	slug: "",
	excerpt: "",
	body: doc(p("Hei")),
	coverImageId: null,
	status: "published" as const,
	publishedAt: null,
	...extra,
});

test("rich text: keeps allowed content and drops unknown nodes and attributes", () => {
	const cleaned = cleanDoc(
		doc(
			{
				type: "heading",
				attrs: { level: 1, onclick: "x" },
				content: [{ type: "text", text: "Otsikko" }],
			},
			{ type: "codeBlock", content: [{ type: "text", text: "rm -rf" }] },
			p("linkki", [
				{ type: "link", attrs: { href: "https://example.com", class: "x" } },
				{ type: "strike" },
			]),
			{
				type: "image",
				attrs: { src: "/media/seed/4.jpg", alt: "Koira", onerror: "x" },
			},
		),
	);
	expect(cleaned).toEqual({
		type: "doc",
		content: [
			{
				type: "heading",
				attrs: { level: 2 },
				content: [{ type: "text", text: "Otsikko" }],
			},
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						text: "linkki",
						marks: [{ type: "link", attrs: { href: "https://example.com" } }],
					},
				],
			},
			{ type: "image", attrs: { src: "/media/seed/4.jpg", alt: "Koira" } },
		],
	});
});

test("rich text: rejects javascript: links, protocol-relative links and foreign images", () => {
	for (const href of [
		"javascript:alert(1)",
		" JavaScript:alert(1)",
		"//evil.example",
		"data:text/html,x",
	])
		expect(() =>
			cleanDoc(doc(p("x", [{ type: "link", attrs: { href } }]))),
		).toThrow("ei kelpaa");
	expect(() =>
		cleanDoc(
			doc({ type: "image", attrs: { src: "https://evil.example/x.jpg" } }),
		),
	).toThrow("kuvapankista");
	expect(
		cleanDoc(doc(p("x", [{ type: "link", attrs: { href: "/kurssit" } }])))
			.content,
	).toHaveLength(1);
});

test("posts: drafts and scheduled posts stay hidden until live", async () => {
	const { api } = caller();
	const draft = await api.posts.create(
		postInput(`Luonnos ${run}`, { status: "draft" }),
	);
	const later = await api.posts.create(
		postInput(`Ajastettu ${run}`, {
			publishedAt: new Date(Date.now() + 86_400_000).toISOString(),
		}),
	);
	const live = await api.posts.create(postInput(`Julkaistu ${run}`));
	const pub = caller(false).api;

	expect(await pub.posts.get({ slug: draft!.slug })).toBeNull();
	expect(await pub.posts.get({ slug: later!.slug })).toBeNull();
	expect((await pub.posts.get({ slug: live!.slug }))?.title).toBe(
		`Julkaistu ${run}`,
	);
	const listed = (await pub.posts.list({})).map((x) => x.slug);
	expect(listed).toContain(live!.slug);
	expect(listed).not.toContain(draft!.slug);
	expect(listed).not.toContain(later!.slug);
});

test("posts: same title gets a -2 slug, and the slug survives a title change", async () => {
	const { api } = caller();
	const a = await api.posts.create(postInput(`Sama otsikko ${run}`));
	const b = await api.posts.create(postInput(`Sama otsikko ${run}`));
	expect(b!.slug).toBe(`${a!.slug}-2`);
	await api.posts.update({ id: a!.id, ...postInput(`Uusi nimi ${run}`) });
	const [row] = await db.select().from(post).where(eq(post.id, a!.id));
	expect(row?.slug).toBe(a!.slug);
});

test("admin procedures reject anonymous callers", async () => {
	const { api } = caller(false);
	await expect(api.posts.adminList()).rejects.toThrow(
		"Authentication required",
	);
	await expect(api.media.list()).rejects.toThrow("Authentication required");
	await expect(
		api.settings.update({
			phone: "",
			email: "",
			businessId: "",
			facebook: "",
			footerText: "",
			defaultDescription: "",
		}),
	).rejects.toThrow("Authentication required");
});

test("pages: system pages can't be deleted, reserved slugs are rejected", async () => {
	const { api } = caller();
	const base = {
		description: "",
		intro: "",
		body: doc(),
		heroImageId: null,
		galleryIds: [],
		inFooter: false,
		published: true,
	};
	await expect(
		api.pages.create({ ...base, title: `Varattu ${run}`, slug: "kurssit" }),
	).rejects.toThrow("jo sivuston käytössä");
	// An auto slug that would hit a reserved path gets a suffix instead of an error.
	const auto = await api.pages.create({ ...base, title: "Blogi", slug: "" });
	expect(auto!.slug).not.toBe("blogi");
	await db
		.update(page)
		.set({ title: `Blogi ${run}` })
		.where(eq(page.id, auto!.id));

	const [system] = await db.select().from(page).where(eq(page.slug, "ehdot"));
	if (system)
		await expect(api.pages.remove({ id: system.id })).rejects.toThrow(
			"ei voi poistaa",
		);
});

const jpeg = () =>
	new Blob([
		new Uint8Array([
			0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1,
		]),
	]);

test("media: upload checks the bytes, the size, and in-use photos can't be deleted", async () => {
	const { api, ctx, objects } = caller();
	await expect(
		uploadMedia(ctx, new Blob(["<svg onload=alert(1)>"]), "x"),
	).rejects.toBeInstanceOf(UploadError);
	const huge = new Blob([jpeg(), new Uint8Array(5 * 1024 * 1024)]);
	await expect(uploadMedia(ctx, huge, "x")).rejects.toThrow("liian suuri");

	const photo = await uploadMedia(ctx, jpeg(), " Koira metsässä ");
	createdMedia.push(photo.id);
	expect(photo.alt).toBe("Koira metsässä");
	expect(photo.mime).toBe("image/jpeg");
	expect(objects.has(photo.key)).toBe(true);

	const used = await api.posts.create(
		postInput(`Kuvan kanssa ${run}`, {
			body: doc({
				type: "image",
				attrs: { src: `/media/${photo.key}`, alt: "" },
			}),
		}),
	);
	await expect(api.media.remove({ id: photo.id })).rejects.toThrow(
		"käytössä kirjoituksessa",
	);
	await api.posts.remove({ id: used!.id });
	await api.media.remove({ id: photo.id });
	expect(objects.has(photo.key)).toBe(false);
});
