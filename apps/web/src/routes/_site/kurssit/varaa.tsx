import { formatDate, formatPrice } from "@koirankoulutus/api/format";
import {
	type CourseRequestInput,
	courseRequestInput,
} from "@koirankoulutus/api/schemas";
import { Button } from "@koirankoulutus/ui/components/button";
import { Input } from "@koirankoulutus/ui/components/input";
import { Label } from "@koirankoulutus/ui/components/label";
import { Textarea } from "@koirankoulutus/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import z from "zod";

import { spotsLeft } from "@/components/course-card";
import { pageHead } from "@/lib/head";
import { useSettings } from "@/lib/settings";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_site/kurssit/varaa")({
	component: BookPage,
	validateSearch: z.object({ kurssi: z.string().optional() }),
	head: pageHead("Varaa kurssi"),
});

type Errors = Partial<Record<keyof CourseRequestInput, string>>;

function BookPage() {
	const { kurssi } = Route.useSearch();
	const { email } = useSettings();
	const navigate = useNavigate();
	const courses = useQuery(trpc.courses.list.queryOptions());
	const [errors, setErrors] = useState<Errors>({});
	const [courseSlug, setCourseSlug] = useState<string | undefined>(kurssi);
	const create = useMutation(trpc.requests.create.mutationOptions());

	const selected = courses.data?.find((c) => c.slug === courseSlug);

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		const parsed = courseRequestInput.safeParse({
			courseId: selected?.id ?? 0,
			name: f.get("name"),
			email: f.get("email"),
			phone: f.get("phone"),
			dogName: f.get("dogName"),
			dogBreed: f.get("dogBreed"),
			dogAge: f.get("dogAge"),
			message: f.get("message") ?? "",
			consent: f.get("consent") === "on",
			website: f.get("website") ?? "",
		});
		if (!parsed.success) {
			const next: Errors = {};
			for (const issue of parsed.error.issues) {
				const key = issue.path[0] as keyof CourseRequestInput;
				next[key] ??= key === "courseId" ? "Valitse kurssi" : issue.message;
			}
			setErrors(next);
			document
				.querySelector<HTMLElement>(`[name="${Object.keys(next)[0]}"]`)
				?.focus();
			return;
		}
		setErrors({});
		create.mutate(parsed.data, {
			onSuccess: () => navigate({ to: "/kurssit/kiitos" }),
		});
	}

	return (
		<div className="mx-auto grid max-w-6xl gap-12 px-5 py-14 lg:grid-cols-[1fr_22rem]">
			<div>
				<p className="font-semibold text-accent text-xs uppercase tracking-[0.2em]">
					Kurssipyyntö
				</p>
				<h1 className="mt-3 font-display font-semibold text-5xl">
					Varaa kurssi
				</h1>
				<p className="mt-4 max-w-xl text-foreground/80 text-lg">
					Täytä tiedot, niin vahvistan paikkasi sähköpostilla. Pyyntö ei vielä
					sido sinua – ilmoittautuminen on sitova vasta vahvistuksen jälkeen.
				</p>

				<form
					onSubmit={onSubmit}
					noValidate
					className="relative mt-10 grid max-w-2xl gap-6"
				>
					<Field label="Kurssi" name="courseId" error={errors.courseId}>
						<select
							id="courseId"
							name="courseId"
							value={courseSlug ?? ""}
							onChange={(e) => setCourseSlug(e.target.value || undefined)}
							aria-invalid={!!errors.courseId}
							className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 aria-invalid:border-destructive"
						>
							<option value="">Valitse kurssi…</option>
							{courses.data?.map((c) => (
								<option key={c.id} value={c.slug}>
									{c.name} – alkaa {formatDate(c.startsOn)}
									{spotsLeft(c) === 0 ? " (täynnä, varasija)" : ""}
								</option>
							))}
						</select>
					</Field>

					<fieldset className="grid gap-6 sm:grid-cols-2">
						<legend className="mb-4 font-display font-semibold text-2xl">
							Sinun tietosi
						</legend>
						<Field
							label="Nimi"
							name="name"
							error={errors.name}
							className="sm:col-span-2"
						>
							<Input
								id="name"
								name="name"
								autoComplete="name"
								required
								aria-invalid={!!errors.name}
							/>
						</Field>
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
					</fieldset>

					<fieldset className="grid gap-6 sm:grid-cols-3">
						<legend className="mb-4 font-display font-semibold text-2xl">
							Koirasi
						</legend>
						<Field label="Nimi" name="dogName" error={errors.dogName}>
							<Input
								id="dogName"
								name="dogName"
								required
								aria-invalid={!!errors.dogName}
							/>
						</Field>
						<Field label="Rotu" name="dogBreed" error={errors.dogBreed}>
							<Input
								id="dogBreed"
								name="dogBreed"
								required
								aria-invalid={!!errors.dogBreed}
							/>
						</Field>
						<Field label="Ikä" name="dogAge" error={errors.dogAge}>
							<Input
								id="dogAge"
								name="dogAge"
								placeholder="esim. 2 v"
								required
								aria-invalid={!!errors.dogAge}
							/>
						</Field>
					</fieldset>

					<Field
						label="Mitä toivot kurssilta? (vapaaehtoinen)"
						name="message"
						error={errors.message}
					>
						<Textarea
							id="message"
							name="message"
							rows={4}
							maxLength={2000}
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
									kurssiehdot ja tietosuojaselosteen
								</Link>{" "}
								ja hyväksyn tietojeni käsittelyn kurssipyynnön hoitamiseksi.
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
						{create.isPending ? "Lähetetään…" : "Lähetä kurssipyyntö"}
					</Button>
				</form>
			</div>

			<aside className="h-fit rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-24">
				{selected ? (
					<>
						<p className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
							Valittu kurssi
						</p>
						<h2 className="mt-2 font-display font-semibold text-2xl">
							{selected.name}
						</h2>
						<dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
							<dt className="text-muted-foreground">Alkaa</dt>
							<dd>{formatDate(selected.startsOn)}</dd>
							<dt className="text-muted-foreground">Aika</dt>
							<dd>{selected.schedule}</dd>
							<dt className="text-muted-foreground">Kertoja</dt>
							<dd>{selected.sessions}</dd>
							<dt className="text-muted-foreground">Alusta</dt>
							<dd>{selected.platform}</dd>
							<dt className="text-muted-foreground">Hinta</dt>
							<dd className="font-semibold">
								{formatPrice(selected.priceCents)}
							</dd>
							<dt className="text-muted-foreground">Paikkoja</dt>
							<dd>
								{spotsLeft(selected) > 0
									? `${spotsLeft(selected)} vapaana`
									: "Täynnä – varasija"}
							</dd>
						</dl>
					</>
				) : (
					<p className="text-muted-foreground text-sm">
						Valitse kurssi, niin näet sen tiedot tässä.
					</p>
				)}
				<p className="mt-6 border-border border-t pt-4 text-muted-foreground text-xs">
					Lasku lähetetään sähköpostilla vahvistuksen jälkeen. Katso
					peruutusehdot{" "}
					<Link to="/ehdot" className="underline">
						kurssiehdoista
					</Link>
					.
				</p>
			</aside>
		</div>
	);
}

function Field({
	label,
	name,
	error,
	className,
	children,
}: {
	label: string;
	name: string;
	error?: string;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div className={`grid gap-2 ${className ?? ""}`}>
			<Label htmlFor={name} className="font-medium">
				{label}
			</Label>
			{children}
			{error && <p className="text-destructive text-sm">{error}</p>}
		</div>
	);
}
