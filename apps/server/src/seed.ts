import type { Storage } from "@koirankoulutus/api/storage";
import type { Database } from "@koirankoulutus/db";
import { account, user } from "@koirankoulutus/db/schema/auth";
import { dog, media, page, post, setting } from "@koirankoulutus/db/schema/cms";
import { course } from "@koirankoulutus/db/schema/courses";
import { hashPassword } from "better-auth/crypto";
import { count, eq, inArray } from "drizzle-orm";

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
// Runs only on a fresh install (see isFreshCms) and only when there are no courses.
export async function seedCourses(db: Database, ids: SeedMediaIds) {
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
			imageId: ids("4.jpg"),
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
			imageId: ids("9.jpg"),
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
			imageId: ids("3.jpg"),
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
			imageId: ids("13.jpg"),
		},
	]);
	console.log("Seeded example courses");
}

// Photos bundled with the site (apps/web/public/images). They're registered as media under
// seed/<file> and uploaded to S3 if missing, so pages, courses and dogs can use them from the library.
const bundledPhotos: Record<string, string> = {
	"1.jpg": "Teija metsässä ämpärit kädessä",
	"2.jpg": "Teija kahden koiran ja palkintoruusukkeiden kanssa metsässä",
	"3.jpg": "Teija ja australianpaimenkoira jälkiliinan kanssa metsätiellä",
	"4.jpg": "Teija ja australianpaimenkoira seuraamassa kapula kädessä",
	"5.jpg": "Australianpaimenkoira tuo noutokapulaa nurmikentällä",
	"6.jpg": "Koira seuraamassa tokokentällä",
	"7.jpg": "Teija ja australianpaimenkoira seuraamassa tokokentällä",
	"8.jpg": "Teija halaa koiraa palkintojen keskellä",
	"9.jpg": "Koira jäljestämässä metsässä",
	"10.jpg": "Särkivaaran Nyt ja Tässä",
	"11.jpg": "Teija ja koira palkintojen kanssa hallissa",
	"12.jpg": "Teija Team Finland -takissa halaa australianpaimenkoiraa",
	"13.jpg": "Kaksi australianpaimenkoiraa sammaleisella kivellä",
	"14.jpg": "Musta koira kantaa ruokakuppia",
	"mauto.jpg": "Ardiente Macho Ultra Fuerte",
	"mersu.jpg": "Särkivaaran Oon Niin Malttamaton",
};

export type SeedMediaIds = (file: string) => string;

// First start with the CMS: no pages yet. Seeding content (and the example courses) happens only
// then, so photos and courses Teija deletes later don't come back on the next restart.
export async function isFreshCms(db: Database) {
	const [row] = await db.select({ n: count() }).from(page);
	return !row?.n;
}

// cwd is apps/server both in dev and in the Docker image.
export async function seedMedia(
	db: Database,
	storage: Storage,
	fresh: boolean,
	dir = "../web/public/images",
): Promise<SeedMediaIds> {
	const keys = Object.keys(bundledPhotos).map((f) => `seed/${f}`);
	if (fresh)
		await db
			.insert(media)
			.values(
				Object.entries(bundledPhotos).map(([file, alt]) => ({
					key: `seed/${file}`,
					mime: "image/jpeg",
					alt,
				})),
			)
			.onConflictDoNothing();
	const rows = await db.select().from(media).where(inArray(media.key, keys));
	for (const row of rows) {
		const file = row.key.slice("seed/".length);
		// The migration registered course photos without alt text.
		if (!row.alt && bundledPhotos[file])
			await db
				.update(media)
				.set({ alt: bundledPhotos[file] })
				.where(eq(media.id, row.id));
		if (await storage.exists(row.key)) continue;
		const photo = Bun.file(`${dir}/${file}`);
		if (!(await photo.exists())) {
			console.warn(`seed photo missing: ${dir}/${file}`);
			continue;
		}
		await storage.put(row.key, photo, "image/jpeg");
	}
	const byFile = new Map(rows.map((r) => [r.key.slice("seed/".length), r.id]));
	return (file) => {
		const id = byFile.get(file);
		if (!id) throw new Error(`seed photo not registered: ${file}`);
		return id;
	};
}

// Tiny builders for Tiptap JSON.
type Inline = string | { text: string; link?: string; bold?: boolean };
const inline = (parts: Inline[]) =>
	parts.map((part) => {
		const t = typeof part === "string" ? { text: part } : part;
		const marks = [
			...(t.bold ? [{ type: "bold" }] : []),
			...(t.link ? [{ type: "link", attrs: { href: t.link } }] : []),
		];
		return { type: "text", text: t.text, ...(marks.length ? { marks } : {}) };
	});
const p = (...parts: Inline[]) => ({
	type: "paragraph",
	content: inline(parts),
});
const h2 = (text: string) => ({
	type: "heading",
	attrs: { level: 2 },
	content: inline([text]),
});
const h3 = (text: string) => ({
	type: "heading",
	attrs: { level: 3 },
	content: inline([text]),
});
const ul = (...items: string[]) => ({
	type: "bulletList",
	content: items.map((i) => ({ type: "listItem", content: [p(i)] })),
});
const doc = (...content: unknown[]) => ({ type: "doc" as const, content });

// MOCK values: the same placeholders the site used before the CMS. Teija edits them under Asetukset.
const initialSettings = {
	phone: "040 123 4567",
	email: "teija@example.com",
	businessId: "1234567-8",
	facebook:
		"https://www.facebook.com/p/koirankoulutus-Nyt-ja-T%C3%A4ss%C3%A4-61562406327189/",
	footerText:
		'Teija "Tytti" Tarkkanen. Koirankoulutuksen verkkokursseja Riihimäeltä.',
	defaultDescription:
		"Koirankoulutuksen verkkokursseja: TOKO, jäljestys ja arjen tottelevaisuus. Kouluttajana Teija Tarkkanen, Riihimäki.",
};

// Runs only on a fresh install (see isFreshCms); each part also checks its own table is empty.
export async function seedContent(db: Database, ids: SeedMediaIds) {
	const [settingRow] = await db.select({ n: count() }).from(setting);
	if (!settingRow?.n)
		await db.insert(setting).values({ id: 1, data: initialSettings });

	const [pageRow] = await db.select({ n: count() }).from(page);
	if (!pageRow?.n) {
		const s = initialSettings;
		await db.insert(page).values([
			{
				slug: "meista",
				title: "Teija ”Tytti” Tarkkanen",
				description:
					'Teija "Tytti" Tarkkanen: tokon koulutusohjaaja vuodesta 1995, kolme tottelevaisuusvaliota, palveluskoiralajien käyttövalioita.',
				intro:
					"Olen 48-vuotias koiraharrastaja Riihimäeltä. Koiria minulla on ollut vuodesta 1988, ja muita olen kouluttanut viikoittain omissa ryhmissä vuodesta 1995. Leireillä koulutan silloin tällöin, kun kyselyjä tulee.\n\nPidän tärkeänä treenata myös omia koiria lajeihin, joissa koulutan – säilyy näppituntuma. Koirankoulutus ei ole eikä siitä koskaan tule päivätyötäni, koska haluan pitää sen mukavana harrastuksena.",
				heroImageId: ids("12.jpg"),
				galleryIds: [
					"2.jpg",
					"9.jpg",
					"11.jpg",
					"6.jpg",
					"8.jpg",
					"14.jpg",
				].map(ids),
				body: doc(
					h2("Toko"),
					ul(
						"Tokon koulutusohjaaja vuodesta 1995",
						"Kolme itse koulutettua tottelevaisuusvaliota",
						"79 erikoisvoittajaluokan ykköstulosta",
						"Tokon maajoukkueessa 2005–2007",
					),
					h2("Palveluskoiralajit"),
					ul(
						"Kolmosluokan kokeet omakouluttamalla koiralla etsinnässä, jäljellä, haussa ja viestissä",
						"Käyttövaliot viestistä ja hakukokeesta",
					),
					h2("Ansiomerkit"),
					ul(
						"Palveluskoirien hopeinen ansiomerkki",
						"Australianpaimenkoirat ry:n hopeinen ansiomerkki",
						"Suursnautserien pronssinen harrastusmerkki – vaikka en ole koskaan omistanut tai ohjannut rodun koiraa",
					),
					h2("Kotona asuvat koirat"),
					p(
						"Olen kasvattanut australianpaimenkoiria vuodesta 2001 kennelnimellä Särkivaaran. Kotona asuu nyt neljännen ja viidennen polven omia koiria.",
					),
				),
			},
			{
				slug: "yhteystiedot",
				title: "Yhteystiedot",
				intro:
					"Kysy kursseista tai koirasi koulutuksesta. Vastaan yleensä muutaman päivän sisällä – koulutus on minulle harrastus, joten iltaisin tavoittaa parhaiten.",
				heroImageId: ids("1.jpg"),
				body: doc(),
			},
			{
				// MOCK: terms and privacy notice are placeholders; Teija must review them before launch.
				slug: "ehdot",
				title: "Kurssiehdot ja tietosuoja",
				description:
					"Kurssien ilmoittautumis-, maksu- ja peruutusehdot sekä tietosuojaseloste.",
				body: doc(
					h2("Kurssiehdot"),
					h3("Ilmoittautuminen"),
					p(
						"Kurssipyyntö lähetetään verkkosivun lomakkeella. Pyyntö ei ole sitova. Ilmoittautuminen on sitova, kun kouluttaja on vahvistanut paikan sähköpostilla.",
					),
					h3("Maksaminen"),
					p(
						"Kurssimaksu laskutetaan sähköpostilla vahvistuksen jälkeen. Maksuaika on 14 päivää, kuitenkin viimeistään ennen kurssin alkua. Liittymislinkki lähetetään, kun lasku on maksettu.",
					),
					h3("Peruutukset"),
					ul(
						"Peruutus viimeistään 7 vuorokautta ennen kurssin alkua: maksuton.",
						"Peruutus myöhemmin: veloitamme 50 % kurssimaksusta.",
						"Kurssin alettua kurssimaksua ei palauteta. Väliin jääneitä kertoja ei hyvitetä.",
						"Kouluttaja voi perua kurssin, jos osallistujia on alle neljä tai kouluttaja sairastuu. Tällöin maksettu kurssimaksu palautetaan kokonaan tai kerta siirretään uuteen ajankohtaan.",
					),
					h3("Vastuu"),
					p(
						"Osallistuja vastaa koirastaan ja sen hyvinvoinnista harjoitusten aikana. Kurssikertoja ei saa tallentaa ilman kouluttajan lupaa.",
					),
					h2("Tietosuojaseloste"),
					h3("Rekisterinpitäjä"),
					p(
						`koirankoulutus Nyt ja Tässä / Teija Tarkkanen, Riihimäki. Y-tunnus ${s.businessId}. Yhteydenotot: `,
						{ text: s.email, link: `mailto:${s.email}` },
						".",
					),
					h3("Mitä tietoja keräämme"),
					p(
						"Kurssipyynnön yhteydessä: nimi, sähköposti, puhelinnumero, koiran nimi, rotu ja ikä sekä vapaaehtoinen viesti.",
					),
					h3("Käyttötarkoitus ja peruste"),
					p(
						"Tietoja käytetään kurssipyynnön käsittelyyn, paikan vahvistamiseen, laskutukseen ja kurssia koskevaan viestintään. Käsittelyn peruste on sopimuksen valmistelu ja täytäntöönpano.",
					),
					h3("Säilytysaika"),
					p(
						"Kurssipyynnöt poistetaan 12 kuukauden kuluttua kurssin päättymisestä. Kirjanpitoon liittyvät tiedot säilytetään kirjanpitolain edellyttämän ajan.",
					),
					h3("Tietojen luovutus ja käsittelijät"),
					p(
						"Tietoja ei myydä tai luovuteta markkinointiin. Sähköpostit lähetetään Resend-palvelun kautta, ja tiedot säilytetään EU:ssa sijaitsevalla palvelimella.",
					),
					h3("Oikeutesi"),
					p(
						"Sinulla on oikeus tarkastaa tietosi, pyytää niiden korjaamista tai poistamista sekä tehdä valitus tietosuojavaltuutetulle. Lähetä pyyntö sähköpostilla yllä olevaan osoitteeseen.",
					),
				),
			},
		]);
	}

	const [dogRow] = await db.select({ n: count() }).from(dog);
	if (!dogRow?.n)
		await db.insert(dog).values([
			{
				name: "Särkivaaran Nyt ja Tässä",
				breed: "Australianpaimenkoira",
				age: "7 v",
				titles: "M-26 FI KVA-PKH HK3 JK3 EK2 BH",
				note: "Palveluskoirien SM-kultaa, -hopeaa ja -pronssia hakukokeessa. Yrityksen kaima.",
				imageId: ids("10.jpg"),
				sort: 0,
			},
			{
				name: "Ardiente Macho Ultra Fuerte",
				breed: "Australianpaimenkoira",
				age: "5 v",
				titles: "JK1 BH",
				imageId: ids("mauto.jpg"),
				sort: 1,
			},
			{
				name: "Särkivaaran Oon Niin Malttamaton",
				breed: "Australianpaimenkoira",
				age: "1 v",
				titles: "Nuori lupaus",
				imageId: ids("mersu.jpg"),
				sort: 2,
			},
		]);

	const [postRow] = await db.select({ n: count() }).from(post);
	if (!postRow?.n)
		await db.insert(post).values({
			slug: "tervetuloa-blogiin",
			title: "Tervetuloa blogiin (Esimerkki)",
			excerpt:
				"Kirjoitan tänne treenivinkkejä, kuulumisia kisoista ja tietoa tulevista kursseista.",
			coverImageId: ids("5.jpg"),
			status: "published",
			publishedAt: new Date("2026-09-26T09:00:00Z"),
			body: doc(
				p(
					"Tämä on esimerkkikirjoitus. Voit muokata tai poistaa sen hallinnan Blogi-välilehdellä.",
				),
				h2("Mitä blogissa on tulossa"),
				ul(
					"Treenivinkkejä tokoon ja palveluskoiralajeihin",
					"Kuulumisia kisoista ja kokeista",
					"Tietoa tulevista verkkokursseista",
				),
				p("Katso myös ", { text: "tulevat kurssit", link: "/kurssit" }, "."),
			),
		});
}
