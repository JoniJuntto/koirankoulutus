import { formatDay } from "@koirankoulutus/api/format";
import { buttonVariants } from "@koirankoulutus/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PenLine } from "lucide-react";

import { postStatus } from "@/lib/post-status";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/admin/_panel/blogi/")({
	component: PostsAdminPage,
});

function PostsAdminPage() {
	const posts = useQuery(trpc.posts.adminList.queryOptions());
	return (
		<div>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="font-semibold text-2xl">Blogi</h1>
					<p className="text-muted-foreground text-sm">
						Kirjoitukset näkyvät sivulla /blogi ja uusimmat kolme etusivulla.
					</p>
				</div>
				<Link
					to="/admin/blogi/$id"
					params={{ id: "uusi" }}
					className={buttonVariants({ size: "lg" })}
				>
					<PenLine /> Kirjoita uusi
				</Link>
			</div>

			<ul className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
				{posts.data?.map((p) => {
					const s = postStatus(p);
					return (
						<li key={p.id}>
							<Link
								to="/admin/blogi/$id"
								params={{ id: String(p.id) }}
								className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 hover:bg-muted/50"
							>
								<span className="font-medium">{p.title}</span>
								<span
									className={`rounded-full px-2.5 py-0.5 font-medium text-xs ${s.className}`}
								>
									{s.label}
								</span>
								<span className="ml-auto text-muted-foreground text-sm">
									Muokattu {formatDay(p.updatedAt)}
								</span>
							</Link>
						</li>
					);
				})}
			</ul>
			{posts.data?.length === 0 && (
				<p className="mt-6 text-muted-foreground">
					Ei vielä kirjoituksia. Aloita painamalla "Kirjoita uusi".
				</p>
			)}
		</div>
	);
}
