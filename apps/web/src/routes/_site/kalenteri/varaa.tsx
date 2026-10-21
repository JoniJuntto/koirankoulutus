import { dateRange } from "@koirankoulutus/api/format";
import {
	type WeekendRequestInput,
	weekendRequestInput,
} from "@koirankoulutus/api/schemas";
import { Button } from "@koirankoulutus/ui/components/button";
import { Input } from "@koirankoulutus/ui/components/input";
import { Textarea } from "@koirankoulutus/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import z from "zod";

import { Field } from "@/components/form-field";
import { pageHead } from "@/lib/head";
import { useSettings } from "@/lib/settings";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_site/kalenteri/varaa")({
	component: WeekendBookPage,
	validateSearch: z.object({
		id: z.number().int().optional().catch(undefined),
	}),
	head: pageHead("Varauspyyntö"),
});

type Errors = Partial<Record<keyof WeekendRequestInput, string>>;

function WeekendBookPage() {
	const { id = 0 } = Route.useSearch();
	const { email } = useSettings();
	const weekend = useQuery(trpc.calendar.freeWeekend.queryOptions({ id }));
	const [errors, setErrors] = useState<Errors>({});
	const create = useMutation(trpc.calendar.request.mutationOptions());

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		const parsed = weekendRequestInput.safeParse({
			eventId: id,
			name: f.get("name"),
			email: f.get("email"),
			phone: f.get("phone"),
			message: f.get("message") ?? "",
			consent: f.get("consent") === "on",
			website: f.get("website") ?? "",
		});
		if (!parsed.success) {
			const next: Errors = {};
			for (const issue of parsed.error.issues) {
				const key = issue.path[0] as keyof WeekendRequestInput;
				next[key] ??= issue.message;
			}
			setErrors(next);
			document
				.querySelector<HTMLElement>(`[name="${Object.keys(next)[0]}"]`)
				?.focus();
			return;
		}
		setErrors({});
		create.mutate(parsed.data);
	}

	const back = (
		<Link
			to="/kalenteri"
			className="font-medium text-primary underline underline-offset-4"
		>
			Takaisin kalenteriin
		</Link>
	);

	if (weekend.isPending)
		return (
			<div className="mx-auto max-w-2xl px-5 py-14">
				<div className="h-40 animate-pulse rounded-2xl bg-muted" />
			</div>
		);

	if (!weekend.data)
		return (
			<div className="mx-auto max-w-2xl px-5 py-14">
				<h1 className="font-display font-semibold text-4xl">
					Viikonloppu ei ole vapaana
				</h1>
				<p className="mt-4 text-foreground/80 text-lg">
					Tämä viikonloppu on jo varattu tai mennyt. Katso muut vapaat ajat
					kalenterista.
				</p>
				<p className="mt-6">{back}</p>
			</div>
		);

	if (create.isSuccess)
		return (
			<div className="mx-auto max-w-2xl px-5 py-14">
				<p className="font-semibold text-accent text-xs uppercase tracking-[0.2em]">
					Kiitos!
				</p>
				<h1 className="mt-3 font-display font-semibold text-4xl">
					Varauspyyntö on lähetetty
				</h1>
				<p className="mt-4 text-foreground/80 text-lg">
					Sait vahvistuksen pyynnön vastaanottamisesta sähköpostiisi. Vastaan
					sinulle mahdollisimman pian.
				</p>
				<p className="mt-6">{back}</p>
			</div>
		);

	return (
		<div className="mx-auto max-w-2xl px-5 py-14">
			<p className="font-semibold text-accent text-xs uppercase tracking-[0.2em]">
				Varauspyyntö
			</p>
			<h1 className="mt-3 font-display font-semibold text-5xl">
				{dateRange(weekend.data)}
			</h1>
			{weekend.data.description && (
				<p className="mt-4 whitespace-pre-line text-foreground/80">
					{weekend.data.description}
				</p>
			)}
			<p className="mt-4 text-foreground/80 text-lg">
				Kerro, mitä toivot, niin palaan asiaan sähköpostilla. Pyyntö ei vielä
				sido sinua, vaan varaus on voimassa vasta vahvistuksen jälkeen.
			</p>

			<form
				onSubmit={onSubmit}
				noValidate
				className="relative mt-10 grid gap-6"
			>
				<Field label="Nimi" name="name" error={errors.name}>
					<Input
						id="name"
						name="name"
						autoComplete="name"
						required
						aria-invalid={!!errors.name}
					/>
				</Field>
				<div className="grid gap-6 sm:grid-cols-2">
					<Field label="Sähköposti" name="email" error={errors.email}>
						<Input
							id="email"
							name="email"
							type="email"
							autoComplete="email"
							required
							aria-invalid={!!errors.email}
						/>
					</Field>
					<Field label="Puhelin" name="phone" error={errors.phone}>
						<Input
							id="phone"
							name="phone"
							type="tel"
							autoComplete="tel"
							required
							aria-invalid={!!errors.phone}
						/>
					</Field>
				</div>
				<Field
					label="Mitä toivot? Kerro esimerkiksi paikka, osallistujamäärä ja aihe."
					name="message"
					error={errors.message}
				>
					<Textarea
						id="message"
						name="message"
						rows={5}
						maxLength={2000}
						required
						aria-invalid={!!errors.message}
						className="bg-card"
					/>
				</Field>

				{/* Honeypot: hidden from people and screen readers, bots tend to fill it. */}
				<div
					aria-hidden
					className="absolute -left-[9999px] h-0 overflow-hidden"
				>
					<label>
						Verkkosivu
						<input name="website" tabIndex={-1} autoComplete="off" />
					</label>
				</div>

				<div>
					<label className="flex items-start gap-3 text-sm">
						<input
							type="checkbox"
							name="consent"
							className="mt-0.5 size-4 accent-[var(--primary)]"
							aria-invalid={!!errors.consent}
							aria-describedby={errors.consent ? "consent-error" : undefined}
						/>
						<span>
							Olen lukenut{" "}
							<Link
								to="/ehdot"
								target="_blank"
								className="font-medium text-primary underline"
							>
								ehdot ja tietosuojaselosteen
							</Link>{" "}
							ja hyväksyn tietojeni käsittelyn varauspyynnön hoitamiseksi.
						</span>
					</label>
					{errors.consent && (
						<p id="consent-error" className="mt-2 text-destructive text-sm">
							{errors.consent}
						</p>
					)}
				</div>

				{create.isError && (
					<p
						role="alert"
						className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm"
					>
						Lähetys epäonnistui: {create.error.message}
						{email && (
							<>
								{" "}
								Voit myös lähettää pyynnön sähköpostilla osoitteeseen{" "}
								<a className="font-medium underline" href={`mailto:${email}`}>
									{email}
								</a>
								.
							</>
						)}
					</p>
				)}

				<Button
					type="submit"
					size="lg"
					className="w-full rounded-full sm:w-auto sm:justify-self-start"
					disabled={create.isPending}
				>
					{create.isPending ? "Lähetetään…" : "Lähetä varauspyyntö"}
				</Button>
			</form>
		</div>
	);
}
