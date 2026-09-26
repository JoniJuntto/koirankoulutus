import { formatDay, mediaUrl } from "@koirankoulutus/api/format";
import type { AppRouter } from "@koirankoulutus/api/routers/index";
import { Link } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";

export type PostSummary =
	inferRouterOutputs<AppRouter>["posts"]["list"][number];

export function PostCard({ post }: { post: PostSummary }) {
	return (
		<article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
			{post.coverKey && (
				<div className="aspect-[3/2] overflow-hidden">
					<img
						src={mediaUrl(post.coverKey)}
						alt={post.coverAlt ?? ""}
						loading="lazy"
						className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
					/>
				</div>
			)}
			<div className="flex flex-1 flex-col gap-2 p-6">
				{post.publishedAt && (
					<p className="text-muted-foreground text-sm">
						{formatDay(post.publishedAt)}
					</p>
				)}
				<h3 className="font-display font-semibold text-2xl leading-tight">
					<Link
						to="/blogi/$slug"
						params={{ slug: post.slug }}
						className="after:absolute after:inset-0 focus-visible:outline-none"
					>
						{post.title}
					</Link>
				</h3>
				{post.excerpt && <p className="text-foreground/80">{post.excerpt}</p>}
				<span className="mt-auto pt-2 font-medium text-primary text-sm group-hover:underline">
					Lue lisää →
				</span>
			</div>
		</article>
	);
}
