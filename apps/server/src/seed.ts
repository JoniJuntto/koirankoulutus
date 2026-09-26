import type { Database } from "@koirankoulutus/db";
import { account, user } from "@koirankoulutus/db/schema/auth";
import { course } from "@koirankoulutus/db/schema/courses";
import { hashPassword } from "better-auth/crypto";
import { count, eq } from "drizzle-orm";

export async function ensureAdmin(
	db: Database,
	email: string,
	password: string,
) {
	const [existing] = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.email, email));
	if (existing) return;
	const id = crypto.randomUUID();
	await db
		.insert(user)
		.values({ id, email, name: "Teija Tarkkanen", emailVerified: true });
	await db.insert(account).values({
		id: crypto.randomUUID(),
		accountId: id,
		providerId: "credential",
		userId: id,
		password: await hashPassword(password),
	});
	console.log(`Created admin user ${email}`);
}

// MOCK: example courses so the site has content before Teija adds real ones.
// ponytail: runs only when the table is empty; if every course is deleted the examples come back.
export async function seedCourses(db: Database) {
	const [row] = await db.select({ n: count() }).from(course);
	if ((row?.n ?? 0) > 0) return;
	await db.insert(course).values([
		{
			slug: "toko-alkeet-verkossa",
			name: "TOKO-alkeet verkossa (Esimerkki)",
			description:
				"Tokon perusliikkeet kotona treenattaviksi: seuraaminen, luoksetulo, paikallaolot ja noudon alkeet. Jokaisella kerralla käydään läpi uusi liike ja edellisen viikon kotitreenit.",
			targetGroup: "Tokosta kiinnostuneet, alokasluokkaan tähtäävät koirakot",
			startsOn: "2026-10-20",
			schedule: "ti klo 18.00–19.00",
			sessions: 6,
			platform: "Zoom",
			priceCents: 8900,
			maxParticipants: 10,
			image: "4.jpg",
		},
		{
			slug: "jaljestyksen-perusteet",
			name: "Jäljestyksen perusteet (Esimerkki)",
			description:
				"Teoriaa ja kotitehtäviä jäljestyksen aloittamiseen: jäljen tekeminen, koiran motivointi, esineilmaisut ja jäljen vaikeuttaminen. Kotitehtävät tehdään metsässä omalla ajalla.",
			targetGroup: "Palveluskoiralajeista ja jäljestämisestä kiinnostuneet",
			startsOn: "2026-11-04",
			schedule: "ke klo 18.30–20.00",
			sessions: 4,
			platform: "Zoom",
			priceCents: 6900,
			maxParticipants: 12,
			image: "9.jpg",
		},
		{
			slug: "arjen-tottelevaisuus",
			name: "Arjen tottelevaisuus (Esimerkki)",
			description:
				"Hihnakäytös, luoksetulo, rauhoittuminen ja kontaktin ottaminen arjen tilanteissa. Selkeät harjoitukset, jotka mahtuvat tavalliseen päivään.",
			targetGroup: "Kaikenikäiset koirat ja niiden omistajat",
			startsOn: "2026-11-10",
			schedule: "ma klo 19.00–20.00",
			sessions: 5,
			platform: "Teams",
			priceCents: 5900,
			maxParticipants: 15,
			image: "3.jpg",
		},
		{
			slug: "nuoren-koiran-ohjaaminen",
			name: "Nuoren koiran ohjaaminen (Esimerkki)",
			description:
				"Murrosikäisen koiran kanssa elämiseen ja treenaamiseen: itsehillintä, keskittyminen ja harrastuksen pohja ilman ylikuormitusta.",
			targetGroup: "6–18 kuukauden ikäiset koirat",
			startsOn: "2026-12-01",
			schedule: "to klo 18.00–19.00",
			sessions: 4,
			platform: "Zoom",
			priceCents: 4900,
			maxParticipants: 10,
			image: "13.jpg",
		},
	]);
	console.log("Seeded example courses");
}
