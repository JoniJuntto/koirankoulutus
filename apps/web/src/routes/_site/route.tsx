import { createFileRoute, Outlet } from "@tanstack/react-router";

import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";

export const Route = createFileRoute("/_site")({
	component: SiteLayout,
});

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
		</div>
	);
}
