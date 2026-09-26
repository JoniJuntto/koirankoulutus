import z from "zod";

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
	image: z.string().regex(/^\d+\.jpg$/),
	published: z.boolean(),
});
export type CourseInput = z.infer<typeof courseInput>;
