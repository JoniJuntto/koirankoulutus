import { createFileRoute } from "@tanstack/react-router";

import { MediaGrid, Uploader } from "@/components/admin/media";

export const Route = createFileRoute("/admin/_panel/kuvat")({
	component: MediaAdminPage,
});

function MediaAdminPage() {
	return (
		<div>
			<h1 className="font-semibold text-2xl">Kuvat</h1>
			<p className="mt-1 max-w-2xl text-muted-foreground text-sm">
				Kaikki sivuston kuvat. Kirjoita jokaiselle kuvalle lyhyt kuvaus: se
				auttaa näkövammaisia ja hakukoneita. Kuvaa, joka on käytössä jollain
				sivulla, ei voi poistaa.
			</p>
			<div className="mt-6">
				<Uploader />
			</div>
			<div className="mt-8">
				<MediaGrid />
			</div>
		</div>
	);
}
