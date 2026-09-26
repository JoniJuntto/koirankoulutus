// Pages with their own route in apps/web (see SYSTEM_PAGES in packages/api/src/routers/pages.ts)
// and which fields their layout shows, so the editor only offers what appears on the page.
export type PageField = "intro" | "hero" | "body" | "gallery";

export const systemPageInfo: Record<
	string,
	{ name: string; hint: string; fields: PageField[] }
> = {
	meista: {
		name: "Kouluttaja (Meistä)",
		hint: "Esittely, saavutukset ja kuvagalleria. Koirat muokataan Koirat-välilehdellä.",
		fields: ["intro", "hero", "body", "gallery"],
	},
	yhteystiedot: {
		name: "Yhteystiedot",
		hint: "Puhelin, sähköposti ja Facebook tulevat Asetukset-välilehdeltä.",
		fields: ["intro", "hero", "body"],
	},
	ehdot: {
		name: "Kurssiehdot ja tietosuoja",
		hint: "Kurssiehdot ja tietosuojaseloste. Linkki on sivuston alalaidassa ja varauslomakkeella.",
		fields: ["body"],
	},
};

export const allPageFields: PageField[] = ["intro", "hero", "body", "gallery"];
