import { mediaUrl } from "@koirankoulutus/api/format";
import { appRouter } from "@koirankoulutus/api/routers/index";
import { getSettings } from "@koirankoulutus/api/routers/settings";

import { ENV } from "./env.server";
import { db, mailer, storage } from "./services";

const SITE_NAME = "koirankoulutus Nyt ja Tässä";
const site = ENV.PUBLIC_SITE_URL.replace(/\/$/, "");

const api = appRouter.createCaller({
	db,
	session: null,
	ip: "server",
	mailer,
	storage,
	trainerEmail: ENV.TRAINER_EMAIL,
	siteUrl: ENV.PUBLIC_SITE_URL,
});

const esc = (s: string) =>
	s.replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			] ?? c,
	);

type Meta = {
	title: string;
	description: string;
	image?: string | null;
	type?: "website" | "article";
};

async function metaFor(path: string): Promise<Meta> {
	const [first = "", second, ...rest] = path.split("/").filter(Boolean);
	if (rest.length) return { title: SITE_NAME, description: "" };
	if (first === "blogi" && second) {
		const p = await api.posts.get({ slug: second });
		if (p)
			return {
				title: p.title,
				description: p.excerpt,
				image: p.coverKey,
				type: "article",
			};
	}
	if (first === "blogi" && !second)
		return { title: "Blogi", description: "Treenivinkkejä ja kuulumisia." };
	if (first === "kurssit")
		return {
			title: "Kurssit",
			description: "Tulevat koirankoulutuksen verkkokurssit.",
		};
	if (first && !second) {
		const p = await api.pages.get({ slug: first });
		if (p)
			return {
				title: p.page.title,
				description: p.page.description || p.page.intro,
				image: p.heroKey,
			};
	}
	return { title: SITE_NAME, description: "" };
}

// Link previews (Facebook, WhatsApp, …) don't run JavaScript, so nginx sends their crawlers here
// for a page with just the Open Graph tags. People get the SPA as usual.
export async function shareHtml(path: string) {
	const meta = await metaFor(path);
	const settings = await getSettings(db);
	const description = (meta.description || settings.defaultDescription).slice(
		0,
		300,
	);
	const url = `${site}${path === "/" ? "" : path}`;
	const image = meta.image
		? `${site}${mediaUrl(meta.image)}`
		: `${site}/og.jpg`;
	const title =
		meta.title === SITE_NAME ? SITE_NAME : `${meta.title} | ${SITE_NAME}`;
	return `<!doctype html>
<html lang="fi">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="${meta.type ?? "website"}">
<meta property="og:locale" content="fi_FI">
<meta property="og:site_name" content="${esc(SITE_NAME)}">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
</head>
<body><a href="${esc(url)}">${esc(meta.title)}</a></body>
</html>`;
}

export async function sitemapXml() {
	const [pages, posts] = await Promise.all([
		db.query.page.findMany({
			where: { published: true },
			columns: { slug: true, updatedAt: true },
		}),
		api.posts.list({}),
	]);
	const urls: { loc: string; lastmod?: Date | null }[] = [
		{ loc: "/" },
		{ loc: "/kurssit" },
		{ loc: "/blogi" },
		...pages.map((p) => ({ loc: `/${p.slug}`, lastmod: p.updatedAt })),
		...posts.map((p) => ({ loc: `/blogi/${p.slug}`, lastmod: p.publishedAt })),
	];
	const body = urls
		.map(
			(u) =>
				`<url><loc>${esc(site + u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod.toISOString().slice(0, 10)}</lastmod>` : ""}</url>`,
		)
		.join("\n");
	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

export const robotsTxt = () =>
	`User-agent: *\nDisallow: /admin\nDisallow: /share/\n\nSitemap: ${site}/sitemap.xml\n`;
