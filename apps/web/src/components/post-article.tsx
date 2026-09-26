import { formatDay, mediaUrl } from "@koirankoulutus/api/format";
import type { RichTextDoc } from "@koirankoulutus/api/rich-text";
import { buttonVariants } from "@koirankoulutus/ui/components/button";
import { Link } from "@tanstack/react-router";

import { RichText } from "@/lib/rich-text";

export function PostArticle({
	post,
}: {
	post: {
		title: string;
		publishedAt: Date | string | null;
		coverKey: string | null;
		coverAlt: string | null;
		body: RichTextDoc;
	};
}) {
	return (
		<article className="mx-auto max-w-3xl px-5 py-14">
			<Link
				to="/blogi"
				className="font-medium text-primary text-sm hover:underline"
			>
				← Kaikki kirjoitukset
			</Link>
			<h1 className="mt-6 text-balance font-display font-semibold text-4xl leading-tight sm:text-5xl">
				{post.title}
			</h1>
			{post.publishedAt && (
				<p className="mt-3 text-muted-foreground">
					<time dateTime={new Date(post.publishedAt).toISOString()}>
						{formatDay(post.publishedAt)}
					</time>
				</p>
			)}
			{post.coverKey && (
				<img
					src={mediaUrl(post.coverKey)}
					alt={post.coverAlt ?? ""}
					className="mt-8 aspect-[3/2] w-full rounded-[2rem] object-cover"
				/>
			)}
			<RichText doc={post.body} className="mt-10 text-lg" />
			<aside className="mt-16 rounded-[2rem] bg-secondary/60 p-8 text-center">
				<p className="font-display font-semibold text-2xl">
					Treenataanko yhdessä?
				</p>
				<p className="mt-2 text-muted-foreground">
					Katso tulevat verkkokurssit ja lähetä pyyntö.
				</p>
				<Link
					to="/kurssit"
					className={buttonVariants({ className: "mt-5 rounded-full" })}
				>
					Katso kurssit
				</Link>
			</aside>
		</article>
	);
}
