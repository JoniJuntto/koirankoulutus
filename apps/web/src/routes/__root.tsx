import { buttonVariants } from "@koirankoulutus/ui/components/button";
import { Toaster } from "@koirankoulutus/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Outlet,
} from "@tanstack/react-router";

import type { trpc } from "@/utils/trpc";

import "../index.css";

export interface RouterAppContext {
	trpc: typeof trpc;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	notFoundComponent: NotFound,
});

function RootComponent() {
	return (
		<>
			<HeadContent />
			<Outlet />
			<Toaster richColors position="top-center" />
		</>
	);
}

function NotFound() {
	return (
		<main className="mx-auto flex min-h-svh max-w-xl flex-col items-center justify-center gap-4 px-5 text-center">
			<p className="font-display text-7xl text-primary italic">404</p>
			<h1 className="font-semibold text-xl">Sivua ei löytynyt</h1>
			<p className="text-muted-foreground">
				Koira on ehkä vienyt sen mennessään.
			</p>
			<Link to="/" className={buttonVariants({ className: "rounded-full" })}>
				Etusivulle
			</Link>
		</main>
	);
}
