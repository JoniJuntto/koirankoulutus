import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { useSettings } from "@/lib/settings";
import { phoneHref } from "@/lib/site";
import { trpc } from "@/utils/trpc";

export default function SiteFooter() {
	const s = useSettings();
	const pages = useSuspenseQuery(trpc.pages.footerList.queryOptions()).data;
	return (
		<footer className="mt-24 bg-primary text-primary-foreground">
			<div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-3">
				<div>
					<p className="font-semibold text-[0.65rem] uppercase tracking-[0.2em] opacity-70">
						koirankoulutus
					</p>
					<p className="font-display text-3xl italic">Nyt ja Tässä</p>
					{s.footerText && (
						<p className="mt-3 max-w-xs text-sm opacity-80">{s.footerText}</p>
					)}
				</div>
				<div className="text-sm">
					<p className="mb-3 font-semibold">Yhteystiedot</p>
					<ul className="space-y-1.5 opacity-90">
						{s.phone && (
							<li>
								<a href={phoneHref(s.phone)} className="hover:underline">
									{s.phone}
								</a>
							</li>
						)}
						{s.email && (
							<li>
								<a href={`mailto:${s.email}`} className="hover:underline">
									{s.email}
								</a>
							</li>
						)}
						{s.facebook && (
							<li>
								<a
									href={s.facebook}
									target="_blank"
									rel="noreferrer"
									className="hover:underline"
								>
									Facebook
								</a>
							</li>
						)}
					</ul>
				</div>
				<div className="text-sm">
					<p className="mb-3 font-semibold">Sivusto</p>
					<ul className="space-y-1.5 opacity-90">
						<li>
							<Link to="/kurssit" className="hover:underline">
								Kurssit
							</Link>
						</li>
						<li>
							<Link to="/blogi" className="hover:underline">
								Blogi
							</Link>
						</li>
						<li>
							<Link to="/meista" className="hover:underline">
								Kouluttaja
							</Link>
						</li>
						{pages.map((p) => (
							<li key={p.slug}>
								<Link
									to="/$slug"
									params={{ slug: p.slug }}
									className="hover:underline"
								>
									{p.title}
								</Link>
							</li>
						))}
						<li>
							<Link to="/ehdot" className="hover:underline">
								Kurssiehdot ja tietosuoja
							</Link>
						</li>
					</ul>
				</div>
			</div>
			<div className="border-primary-foreground/15 border-t">
				<p className="mx-auto max-w-6xl px-5 py-5 text-xs opacity-70">
					© {new Date().getFullYear()} koirankoulutus Nyt ja Tässä
					{s.businessId && ` · Y-tunnus ${s.businessId}`}
				</p>
			</div>
		</footer>
	);
}
