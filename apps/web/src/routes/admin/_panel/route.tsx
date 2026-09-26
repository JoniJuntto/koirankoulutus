import { Button } from "@koirankoulutus/ui/components/button";
import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { ExternalLink, LogOut } from "lucide-react";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/admin/_panel")({
	component: AdminLayout,
	head: () => ({
		meta: [
			{ title: "Hallinta | Nyt ja Tässä" },
			{ name: "robots", content: "noindex" },
		],
	}),
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) throw redirect({ to: "/admin/login" });
		return { user: session.data.user };
	},
});

function AdminLayout() {
	const { user } = Route.useRouteContext();
	const navigate = useNavigate();
	const tab =
		"rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground";

	return (
		<div className="min-h-svh bg-muted/50">
			<header className="border-border border-b bg-card">
				<div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
					<span className="font-display font-semibold text-lg text-primary italic">
						Hallinta
					</span>
					<nav className="flex gap-1">
						<Link
							to="/admin"
							activeOptions={{ exact: true }}
							className={tab}
							activeProps={{ className: "bg-secondary !text-foreground" }}
						>
							Pyynnöt
						</Link>
						<Link
							to="/admin/kurssit"
							className={tab}
							activeProps={{ className: "bg-secondary !text-foreground" }}
						>
							Kurssit
						</Link>
					</nav>
					<div className="ml-auto flex items-center gap-2">
						<span className="hidden text-muted-foreground text-sm sm:inline">
							{user.email}
						</span>
						<a
							href="/"
							target="_blank"
							className="inline-flex items-center gap-1 px-2 text-sm hover:underline"
							rel="noopener"
						>
							Sivusto <ExternalLink className="size-3.5" />
						</a>
						<Button
							variant="ghost"
							size="sm"
							onClick={async () => {
								await authClient.signOut();
								navigate({ to: "/admin/login" });
							}}
						>
							<LogOut /> Kirjaudu ulos
						</Button>
					</div>
				</div>
			</header>
			<main className="mx-auto max-w-7xl px-5 py-8">
				<Outlet />
			</main>
		</div>
	);
}
