import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PostCard } from "@/components/post-card";
import { pageHead } from "@/lib/head";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_site/blogi/")({
	component: BlogPage,
	loader: ({ context: { queryClient, trpc } }) =>
		queryClient.ensureQueryData(trpc.posts.list.queryOptions({})),
	head: pageHead(
		"Blogi",
		"Treenivinkkejä, kuulumisia kisoista ja tietoa tulevista kursseista.",
	),
});

function BlogPage() {
	const posts = useSuspenseQuery(trpc.posts.list.queryOptions({})).data;
	return (
		<div className="mx-auto max-w-6xl px-5 py-14">
			<header className="max-w-2xl">
				<p className="font-semibold text-accent text-xs uppercase tracking-[0.2em]">
					Blogi
				</p>
				<h1 className="mt-3 font-display font-semibold text-5xl">
					Treenipäiväkirja
				</h1>
				<p className="mt-4 text-foreground/80 text-lg">
					Treenivinkkejä, kuulumisia kisoista ja tietoa tulevista kursseista.
				</p>
			</header>
			<div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{posts.map((p) => (
					<PostCard key={p.id} post={p} />
				))}
			</div>
			{posts.length === 0 && (
				<p className="mt-6 text-muted-foreground">
					Ensimmäinen kirjoitus on tulossa pian.
				</p>
			)}
		</div>
	);
}
