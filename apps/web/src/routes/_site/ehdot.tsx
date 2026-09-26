import { formatDay } from "@koirankoulutus/api/format";
import { createFileRoute } from "@tanstack/react-router";

import { pageHead } from "@/lib/head";
import { loadPage } from "@/lib/load-page";
import { RichText } from "@/lib/rich-text";

export const Route = createFileRoute("/_site/ehdot")({
	component: TermsPage,
	loader: ({ context }) => loadPage(context, "ehdot"),
	head: ({ loaderData }) =>
		pageHead(
			loaderData?.page.title ?? "Kurssiehdot ja tietosuojaseloste",
			loaderData?.page.description,
		)(),
});

function TermsPage() {
	const { page } = Route.useLoaderData();
	return (
		<article className="mx-auto max-w-3xl px-5 py-14">
			<h1 className="font-display font-semibold text-5xl">{page.title}</h1>
			<p className="mt-4 text-muted-foreground">
				Päivitetty {formatDay(page.updatedAt)}
			</p>
			<RichText doc={page.body} className="mt-10" />
		</article>
	);
}
