import { formatDay } from "@koirankoulutus/api/format";
import { buttonVariants } from "@koirankoulutus/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { EyeOff, FilePlus2, Lock } from "lucide-react";

import { systemPageInfo } from "@/lib/system-pages";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/admin/_panel/sivut/")({
	component: PagesAdminPage,
});

function PagesAdminPage() {
	const pages = useQuery(trpc.pages.adminList.queryOptions());
	return (
		<div>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="font-semibold text-2xl">Sivut</h1>
					<p className="text-muted-foreground text-sm">
						Etusivu ja kurssisivu päivittyvät kursseista ja blogista. Muita
						sivuja voit muokata täällä.
					</p>
				</div>
				<Link
					to="/admin/sivut/$id"
					params={{ id: "uusi" }}
					className={buttonVariants({ size: "lg" })}
				>
					<FilePlus2 /> Uusi sivu
				</Link>
			</div>
			<ul className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
				{pages.data?.map((p) => {
					const system = systemPageInfo[p.slug];
					return (
						<li key={p.id}>
							<Link
								to="/admin/sivut/$id"
								params={{ id: String(p.id) }}
								className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 hover:bg-muted/50"
							>
								<span className="font-medium">{system?.name ?? p.title}</span>
								<span className="text-muted-foreground text-sm">/{p.slug}</span>
								{system && (
									<span
										className="inline-flex items-center gap-1 text-muted-foreground text-xs"
										title="Sivuston perussivu: sitä ei voi poistaa"
									>
										<Lock className="size-3" /> perussivu
									</span>
								)}
								{!p.published && (
									<span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground text-xs">
										<EyeOff className="size-3" /> piilotettu
									</span>
								)}
								<span className="ml-auto text-muted-foreground text-sm">
									Muokattu {formatDay(p.updatedAt)}
								</span>
							</Link>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
