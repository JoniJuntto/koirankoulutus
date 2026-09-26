import { mediaUrl } from "@koirankoulutus/api/format";
import { buttonVariants } from "@koirankoulutus/ui/components/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { pageHead } from "@/lib/head";
import { loadPage } from "@/lib/load-page";
import { Paragraphs } from "@/lib/paragraphs";
import { RichText } from "@/lib/rich-text";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_site/meista")({
	component: AboutPage,
	loader: async ({ context }) => {
		const [page] = await Promise.all([
			loadPage(context, "meista"),
			context.queryClient.ensureQueryData(
				context.trpc.dogs.list.queryOptions(),
			),
		]);
		return page;
	},
	head: ({ loaderData }) =>
		pageHead(
			loaderData?.page.title ?? "Kouluttaja",
			loaderData?.page.description,
		)(),
});

function AboutPage() {
	const { page, heroKey, heroAlt, gallery } = Route.useLoaderData();
	const dogs = useSuspenseQuery(trpc.dogs.list.queryOptions()).data;

	return (
		<>
			<section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-14 pb-20 md:grid-cols-[1fr_1.1fr]">
				{heroKey && (
					<img
						src={mediaUrl(heroKey)}
						alt={heroAlt ?? ""}
						className="aspect-[4/5] w-full rounded-[2rem] object-cover"
					/>
				)}
				<div>
					<p className="font-semibold text-accent text-xs uppercase tracking-[0.2em]">
						Kouluttaja
					</p>
					<h1 className="mt-3 font-display font-semibold text-5xl leading-tight">
						{page.title}
					</h1>
					<Paragraphs
						text={page.intro}
						className="mt-6 space-y-4 text-foreground/80 text-lg leading-relaxed"
					/>
				</div>
			</section>

			<section className="border-border border-t bg-card">
				<div className="mx-auto max-w-6xl px-5 py-20">
					<RichText doc={page.body} className="max-w-3xl text-lg" />
					{dogs.length > 0 && (
						<div className="mt-12 grid items-start gap-6 md:grid-cols-3">
							{dogs.map(({ dog, imageKey }) => (
								<article
									key={dog.id}
									className="overflow-hidden rounded-2xl border border-border bg-background"
								>
									{imageKey && (
										<img
											src={mediaUrl(imageKey)}
											alt={dog.name}
											loading="lazy"
											className="aspect-[4/3] w-full object-cover"
										/>
									)}
									<div className="p-6">
										<h3 className="font-display font-semibold text-xl">
											{dog.name}
										</h3>
										{(dog.breed || dog.age) && (
											<p className="mt-1 text-muted-foreground text-sm">
												{[dog.breed, dog.age].filter(Boolean).join(", ")}
											</p>
										)}
										{dog.titles && (
											<p className="mt-3 font-mono text-primary text-xs tracking-tight">
												{dog.titles}
											</p>
										)}
										{dog.note && <p className="mt-3 text-sm">{dog.note}</p>}
									</div>
								</article>
							))}
						</div>
					)}
				</div>
			</section>

			<section className="mx-auto max-w-6xl px-5 pt-20">
				{gallery.length > 0 && (
					<>
						<h2 className="sr-only">Kuvia</h2>
						<div className="columns-2 gap-4 md:columns-3 [&>img]:mb-4">
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
					</>
				)}
				<div className="mt-12 text-center">
					<Link
						to="/kurssit"
						className={buttonVariants({
							size: "lg",
							className: "rounded-full",
						})}
					>
						Katso tulevat kurssit
					</Link>
				</div>
			</section>
		</>
	);
}
