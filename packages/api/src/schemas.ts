import z from "zod";

import { richTextDoc } from "./rich-text";

// Shared by the web forms and the server (the server re-validates everything).
export const courseRequestInput = z.object({
	courseId: z.number().int().positive(),
	name: z.string().trim().min(2, "Kirjoita nimesi").max(100),
	email: z.email("Tarkista sähköpostiosoite").max(200),
	phone: z
		.string()
		.trim()
		.min(5, "Tarkista puhelinnumero")
		.max(30)
		.regex(/^[+\d\s()-]+$/, "Tarkista puhelinnumero"),
	dogName: z.string().trim().min(1, "Kirjoita koiran nimi").max(100),
	dogBreed: z.string().trim().min(1, "Kirjoita koiran rotu").max(100),
	dogAge: z.string().trim().min(1, "Kirjoita koiran ikä").max(50),
	message: z.string().trim().max(2000).default(""),
	consent: z.literal(true, "Hyväksy ehdot ja tietosuojaseloste"),
	// Honeypot: hidden from people, bots fill it in.
	website: z.string().max(200).optional(),
});
export type CourseRequestInput = z.input<typeof courseRequestInput>;

export const courseInput = z.object({
	slug: z
		.string()
		.trim()
		.min(2)
		.max(80)
		.regex(/^[a-z0-9-]+$/, "Vain pienet kirjaimet, numerot ja väliviivat"),
	name: z.string().trim().min(2).max(120),
	description: z.string().trim().min(10).max(3000),
	targetGroup: z.string().trim().min(2).max(300),
	startsOn: z.iso.date(),
	schedule: z.string().trim().min(2).max(120),
	sessions: z.number().int().min(1).max(100),
	platform: z.string().trim().min(2).max(80),
	priceCents: z.number().int().min(0).max(1_000_000),
	maxParticipants: z.number().int().min(1).max(500),
	imageId: z.uuid("Valitse kuva"),
	published: z.boolean(),
});
export type CourseInput = z.infer<typeof courseInput>;

const imageId = z.uuid().nullable();
const slugField = z
	.string()
	.trim()
	.max(80)
	.regex(/^[a-z0-9-]*$/, "Vain pienet kirjaimet (a–z), numerot ja väliviivat");

export const pageInput = z.object({
	title: z.string().trim().min(1, "Kirjoita otsikko").max(150),
	// Empty = generate from the title.
	slug: slugField,
	description: z.string().trim().max(300),
	intro: z.string().trim().max(2000),
	body: richTextDoc,
	heroImageId: imageId,
	galleryIds: z.array(z.uuid()).max(60),
	inFooter: z.boolean(),
	published: z.boolean(),
});
export type PageInput = z.input<typeof pageInput>;

export const postInput = z.object({
	title: z.string().trim().min(1, "Kirjoita otsikko").max(150),
	slug: slugField,
	excerpt: z.string().trim().max(400),
	body: richTextDoc,
	coverImageId: imageId,
	status: z.enum(["draft", "published"]),
	// Empty = now, when published. A future time schedules the post.
	publishedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type PostInput = z.input<typeof postInput>;

export const dogInput = z.object({
	name: z.string().trim().min(1, "Kirjoita koiran nimi").max(120),
	breed: z.string().trim().max(120),
	age: z.string().trim().max(50),
	titles: z.string().trim().max(300),
	note: z.string().trim().max(1000),
	imageId,
});
export type DogInput = z.input<typeof dogInput>;

const optionalUrl = z.union([
	z.literal(""),
	z
		.url({ protocol: /^https?$/, error: "Tarkista osoite (alkaa https://)" })
		.max(300),
]);

export const settingsInput = z.object({
	phone: z.string().trim().max(40),
	email: z.union([
		z.literal(""),
		z.email("Tarkista sähköpostiosoite").max(200),
	]),
	businessId: z.string().trim().max(20),
	facebook: optionalUrl,
	footerText: z.string().trim().max(300),
	defaultDescription: z.string().trim().max(300),
});
export type SettingsInput = z.infer<typeof settingsInput>;
