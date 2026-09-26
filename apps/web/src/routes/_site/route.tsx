import { createFileRoute, Outlet } from "@tanstack/react-router";

import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { useSettings } from "@/lib/settings";
import { phoneHref } from "@/lib/site";

export const Route = createFileRoute("/_site")({
	component: SiteLayout,
	loader: ({ context: { queryClient, trpc } }) =>
		Promise.all([
			queryClient.ensureQueryData(trpc.settings.get.queryOptions()),
			queryClient.ensureQueryData(trpc.pages.footerList.queryOptions()),
		]),
});

function LocalBusinessJsonLd() {
	const s = useSettings();
	const data = {
		"@context": "https://schema.org",
		"@type": "LocalBusiness",
		name: "koirankoulutus Nyt ja Tässä",
		description: s.defaultDescription || undefined,
		image: `${location.origin}/og.jpg`,
		telephone: s.phone ? phoneHref(s.phone).slice(4) : undefined,
		email: s.email || undefined,
		address: {
			"@type": "PostalAddress",
			addressLocality: "Riihimäki",
			addressCountry: "FI",
		},
		founder: { "@type": "Person", name: "Teija Tarkkanen" },
		sameAs: s.facebook ? [s.facebook] : undefined,
	};
	return (
		<script
			type="application/ld+json"
			// Settings are admin-written text: escape "<" so a value can't close the script tag.
			dangerouslySetInnerHTML={{
				__html: JSON.stringify(data).replace(/</g, "\\u003c"),
			}}
		/>
	);
}

function SiteLayout() {
	return (
		<div className="flex min-h-svh flex-col">
			<a
				href="#sisalto"
				className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
			>
				Siirry sisältöön
			</a>
			<SiteHeader />
			<main id="sisalto" className="flex-1">
				<Outlet />
			</main>
			<SiteFooter />
			<LocalBusinessJsonLd />
		</div>
	);
}
