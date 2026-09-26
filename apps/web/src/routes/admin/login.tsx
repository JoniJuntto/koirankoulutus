import { Button } from "@koirankoulutus/ui/components/button";
import { Input } from "@koirankoulutus/ui/components/input";
import { Label } from "@koirankoulutus/ui/components/label";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Logo } from "@/components/site-header";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/admin/login")({
	component: LoginPage,
	head: () => ({
		meta: [
			{ title: "Kirjaudu | Hallinta" },
			{ name: "robots", content: "noindex" },
		],
	}),
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (session.data) throw redirect({ to: "/admin" });
	},
});

function LoginPage() {
	const navigate = useNavigate();
	const [error, setError] = useState<string>();
	const [pending, setPending] = useState(false);

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		setPending(true);
		setError(undefined);
		const { error } = await authClient.signIn.email({
			email: String(f.get("email")),
			password: String(f.get("password")),
		});
		setPending(false);
		if (error) {
			setError(
				error.status === 401
					? "Väärä sähköposti tai salasana."
					: (error.message ?? "Kirjautuminen epäonnistui."),
			);
			return;
		}
		navigate({ to: "/admin" });
	}

	return (
		<main className="flex min-h-svh items-center justify-center bg-secondary/50 px-5">
			<form
				onSubmit={onSubmit}
				className="w-full max-w-sm space-y-5 rounded-2xl bg-card p-8 shadow-sm"
			>
				<Logo />
				<h1 className="font-semibold text-xl">Hallinta</h1>
				<div className="grid gap-2">
					<Label htmlFor="email">Sähköposti</Label>
					<Input
						id="email"
						name="email"
						type="email"
						autoComplete="username"
						required
					/>
				</div>
				<div className="grid gap-2">
					<Label htmlFor="password">Salasana</Label>
					<Input
						id="password"
						name="password"
						type="password"
						autoComplete="current-password"
						required
					/>
				</div>
				{error && (
					<p role="alert" className="text-destructive text-sm">
						{error}
					</p>
				)}
				<Button type="submit" className="w-full" disabled={pending}>
					{pending ? "Kirjaudutaan…" : "Kirjaudu"}
				</Button>
			</form>
		</main>
	);
}
