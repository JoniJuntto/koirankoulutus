import { mediaUrl } from "@koirankoulutus/api/format";
import { docText } from "@koirankoulutus/api/rich-text";
import { createFileRoute } from "@tanstack/react-router";

import { pageHead } from "@/lib/head";
import { loadPage } from "@/lib/load-page";
import { Paragraphs } from "@/lib/paragraphs";
import { RichText } from "@/lib/rich-text";

// Pages Teija creates in admin (Sivut → Uusi sivu), at /<slug>.
export const Route = createFileRoute("/_site/$slug")({
	component: CustomPage,
	loader: ({ context, params }) => loadPage(context, params.slug),
	head: ({ loaderData }) =>
		loaderData
			? pageHead(
					loaderData.page.title,
					loaderData.page.description ||
						loaderData.page.intro.slice(0, 160) ||
						docText(loaderData.page.body),
				)()
			: {},
});

function CustomPage() {
	const { page, heroKey, heroAlt, gallery } = Route.useLoaderData();
	return (
		<article className="mx-auto max-w-3xl px-5 py-14">
			<h1 className="text-balance font-display font-semibold text-5xl leading-tight">
				{page.title}
			</h1>
			<Paragraphs
				text={page.intro}
				className="mt-5 space-y-4 text-foreground/80 text-xl leading-relaxed"
			/>
			{heroKey && (
				<img
					src={mediaUrl(heroKey)}
					alt={heroAlt ?? ""}
					className="mt-10 aspect-[3/2] w-full rounded-[2rem] object-cover"
				/>
			)}
			<RichText doc={page.body} className="mt-10 text-lg" />
			{gallery.length > 0 && (
				<div className="mt-12 columns-2 gap-4 [&>img]:mb-4">
					{gallery.map((g) => (
						<img
							key={g.id}
							src={mediaUrl(g.key)}
							alt={g.alt}
							loading="lazy"
							className="w-full rounded-2xl"
						/>
					))}
				</div>
			)}
		</article>
	);
}
