import { Link } from "@tanstack/react-router";

import { contact } from "@/lib/site";

export default function SiteFooter() {
	return (
		<footer className="mt-24 bg-primary text-primary-foreground">
			<div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-3">
				<div>
					<p className="font-semibold text-[0.65rem] uppercase tracking-[0.2em] opacity-70">
						koirankoulutus
					</p>
					<p className="font-display text-3xl italic">Nyt ja Tässä</p>
					<p className="mt-3 max-w-xs text-sm opacity-80">
						Teija "Tytti" Tarkkanen. Koirankoulutuksen verkkokursseja
						Riihimäeltä.
					</p>
				</div>
				<div className="text-sm">
					<p className="mb-3 font-semibold">Yhteystiedot</p>
					<ul className="space-y-1.5 opacity-90">
						<li>
							<a href={contact.phoneHref} className="hover:underline">
								{contact.phone}
							</a>
						</li>
						<li>
							<a href={`mailto:${contact.email}`} className="hover:underline">
								{contact.email}
							</a>
						</li>
						<li>
							<a
								href={contact.facebook}
								target="_blank"
								rel="noreferrer"
								className="hover:underline"
							>
								Facebook
							</a>
						</li>
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
							<Link to="/meista" className="hover:underline">
								Kouluttaja
							</Link>
						</li>
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
					© {new Date().getFullYear()} koirankoulutus Nyt ja Tässä · Y-tunnus{" "}
					{contact.businessId}
				</p>
			</div>
		</footer>
	);
}
