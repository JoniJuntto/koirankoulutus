import { dateRange, today } from "@koirankoulutus/api/format";
import type { AppRouter } from "@koirankoulutus/api/routers/index";
import {
	type CalendarEventInput,
	calendarEventInput,
} from "@koirankoulutus/api/schemas";
import { Button } from "@koirankoulutus/ui/components/button";
import { Textarea } from "@koirankoulutus/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import {
	AlertTriangle,
	Check,
	Mail,
	Pencil,
	Phone,
	Plus,
	Trash2,
	X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { fieldErrors, TextField } from "@/components/admin/fields";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/admin/_panel/kalenteri")({
	component: CalendarAdminPage,
});

type Outputs = inferRouterOutputs<AppRouter>["calendar"];
type CalendarEvent = Outputs["adminList"][number]["event"];
type WeekendRequest = Outputs["requests"][number];
type Kind = CalendarEventInput["kind"];

const kinds: Record<Kind, { label: string; hint: string; badge: string }> = {
	public: {
		label: "Julkinen tapahtuma",
		hint: "Kaikki tiedot näkyvät sivustolla.",
		badge: "bg-emerald-100 text-emerald-900",
	},
	private: {
		label: "Yksityinen",
		hint: 'Sivustolla näkyvät vain päivät ja otsikko, tai "Varattu".',
		badge: "bg-stone-200 text-stone-700",
	},
	free_weekend: {
		label: "Vapaa viikonloppu",
		hint: "Kävijät voivat lähettää tästä varauspyynnön.",
		badge: "bg-amber-100 text-amber-900",
	},
};

const statusBadge = {
	new: "bg-amber-100 text-amber-900",
	confirmed: "bg-emerald-100 text-emerald-900",
	declined: "bg-stone-200 text-stone-700",
} as const;
const statusLabel = {
	new: "Uusi",
	confirmed: "Vahvistettu",
	declined: "Hylätty",
} as const;

const dateTime = (d: Date | string) =>
	new Date(d).toLocaleString("fi-FI", {
		dateStyle: "short",
		timeStyle: "short",
	});

function useRefresh() {
	const queryClient = useQueryClient();
	return () =>
		Promise.all(
			[
				trpc.calendar.adminList.queryKey(),
				trpc.calendar.requests.queryKey(),
				trpc.calendar.list.pathKey(),
			].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
		);
}

function CalendarAdminPage() {
	const events = useQuery(trpc.calendar.adminList.queryOptions());
	const requests = useQuery(trpc.calendar.requests.queryOptions());
	const [editing, setEditing] = useState<CalendarEvent | "new" | null>(null);
	const [showPast, setShowPast] = useState(false);
	const refresh = useRefresh();
	const remove = useMutation(
		trpc.calendar.remove.mutationOptions({
			onSuccess: () => {
				refresh();
				toast.success("Merkintä poistettu");
			},
			onError: (e) => toast.error(e.message),
		}),
	);

	const now = today();
	const visible =
		events.data?.filter((r) => showPast || r.event.endsOn >= now) ?? [];
	const newRequests = requests.data?.filter((r) => r.request.status === "new");
	const handled = requests.data?.filter((r) => r.request.status !== "new");

	return (
		<div className="grid gap-10">
			<section>
				<h1 className="font-semibold text-2xl">Varauspyynnöt</h1>
				<div className="mt-4 grid gap-4 lg:grid-cols-2">
					{newRequests?.map((r) => (
						<RequestCard key={r.request.id} item={r} />
					))}
				</div>
				{newRequests?.length === 0 && (
					<p className="mt-2 text-muted-foreground text-sm">
						Ei uusia varauspyyntöjä.
					</p>
				)}
				{!!handled?.length && (
					<details className="mt-4">
						<summary className="cursor-pointer text-muted-foreground text-sm">
							Käsitellyt pyynnöt ({handled.length})
						</summary>
						<div className="mt-4 grid gap-4 lg:grid-cols-2">
							{handled.map((r) => (
								<RequestCard key={r.request.id} item={r} />
							))}
						</div>
					</details>
				)}
			</section>

			<section>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h2 className="font-semibold text-2xl">Kalenteri</h2>
					{!editing && (
						<Button onClick={() => setEditing("new")}>
							<Plus /> Uusi merkintä
						</Button>
					)}
				</div>

				{editing && (
					<EventForm
						key={editing === "new" ? "new" : editing.id}
						event={editing === "new" ? null : editing}
						onDone={() => {
							setEditing(null);
							refresh();
						}}
					/>
				)}

				<label className="mt-4 flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={showPast}
						onChange={(e) => setShowPast(e.target.checked)}
						className="size-4 accent-[var(--primary)]"
					/>
					Näytä myös menneet
				</label>

				<div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
					<table className="w-full text-left text-sm">
						<thead className="border-border border-b text-muted-foreground text-xs uppercase">
							<tr>
								<th className="px-4 py-3 font-medium">Päivät</th>
								<th className="px-4 py-3 font-medium">Tyyppi</th>
								<th className="px-4 py-3 font-medium">Otsikko</th>
								<th className="px-4 py-3 font-medium">Pyyntöjä</th>
								<th className="px-4 py-3" />
							</tr>
						</thead>
						<tbody>
							{visible.map(({ event: e, pending }) => (
								<tr key={e.id} className="border-border border-b last:border-0">
									<td className="whitespace-nowrap px-4 py-3">
										{dateRange(e)}
									</td>
									<td className="px-4 py-3">
										<span
											className={`whitespace-nowrap rounded-full px-2.5 py-0.5 font-medium text-xs ${kinds[e.kind].badge}`}
										>
											{kinds[e.kind].label}
										</span>
									</td>
									<td className="px-4 py-3">
										{e.title || (
											<span className="text-muted-foreground">
												{e.kind === "private" ? "Varattu" : "–"}
											</span>
										)}
									</td>
									<td className="px-4 py-3">
										{pending > 0 ? (
											<span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-medium text-amber-900 text-xs">
												{pending} uutta
											</span>
										) : (
											<span className="text-muted-foreground">–</span>
										)}
									</td>
									<td className="px-4 py-3">
										<div className="flex justify-end gap-1">
											<Button
												variant="ghost"
												size="icon-sm"
												aria-label={`Muokkaa ${dateRange(e)}`}
												onClick={() => setEditing(e)}
											>
												<Pencil />
											</Button>
											<Button
												variant="ghost"
												size="icon-sm"
												aria-label={`Poista ${dateRange(e)}`}
												onClick={() => {
													if (
														window.confirm(
															`Poistetaanko merkintä ${dateRange(e)}?`,
														)
													)
														remove.mutate({ id: e.id });
												}}
											>
												<Trash2 />
											</Button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
					{events.data && visible.length === 0 && (
						<p className="p-6 text-muted-foreground text-sm">
							Ei tulevia merkintöjä.
						</p>
					)}
				</div>
			</section>
		</div>
	);
}

const empty: CalendarEventInput = {
	kind: "public",
	title: "",
	startsOn: today(),
	endsOn: today(),
	time: "",
	location: "",
	description: "",
	link: "",
};

function EventForm({
	event,
	onDone,
}: {
	event: CalendarEvent | null;
	onDone: () => void;
}) {
	const [values, setValues] = useState<CalendarEventInput>(
		event ? { ...empty, ...event } : empty,
	);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const onError = (e: { message: string }) => toast.error(e.message);
	const create = useMutation(trpc.calendar.create.mutationOptions({ onError }));
	const update = useMutation(trpc.calendar.update.mutationOptions({ onError }));

	const set = <K extends keyof CalendarEventInput>(
		key: K,
		value: CalendarEventInput[K],
	) =>
		setValues((v) => ({
			...v,
			[key]: value,
			// Moving the start past the end drags the end along.
			...(key === "startsOn" && v.endsOn < String(value)
				? { endsOn: String(value) }
				: {}),
		}));

	function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		// Only the fields shown for this kind are saved, so nothing hidden ends up public.
		const v = values;
		const cleaned: CalendarEventInput =
			v.kind === "public"
				? v
				: {
						...empty,
						kind: v.kind,
						startsOn: v.startsOn,
						endsOn: v.endsOn,
						title: v.kind === "private" ? v.title : "",
						description: v.description,
					};
		const parsed = calendarEventInput.safeParse(cleaned);
		if (!parsed.success) {
			setErrors(fieldErrors(parsed.error));
			return;
		}
		setErrors({});
		const done = () => {
			toast.success(event ? "Merkintä tallennettu" : "Merkintä lisätty");
			onDone();
		};
		if (event)
			update.mutate({ id: event.id, ...parsed.data }, { onSuccess: done });
		else create.mutate(parsed.data, { onSuccess: done });
	}

	return (
		<form
			onSubmit={onSubmit}
			className="mt-6 rounded-xl border border-border bg-card p-6"
		>
			<h3 className="font-semibold text-lg">
				{event ? "Muokkaa merkintää" : "Uusi merkintä"}
			</h3>

			<fieldset className="mt-5 grid gap-2 sm:grid-cols-3">
				<legend className="mb-2 font-medium text-sm">Tyyppi</legend>
				{(Object.keys(kinds) as Kind[]).map((k) => (
					<label
						key={k}
						className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm ${values.kind === k ? "border-primary bg-primary/5" : "border-border"}`}
					>
						<input
							type="radio"
							name="kind"
							checked={values.kind === k}
							onChange={() => set("kind", k)}
							className="mt-0.5 accent-[var(--primary)]"
						/>
						<span>
							<span className="font-medium">{kinds[k].label}</span>
							<span className="block text-muted-foreground text-xs">
								{kinds[k].hint}
							</span>
						</span>
					</label>
				))}
			</fieldset>

			<div className="mt-5 grid gap-5 md:grid-cols-2">
				{values.kind !== "free_weekend" && (
					<div className="md:col-span-2">
						<TextField
							label={
								values.kind === "public"
									? "Otsikko"
									: "Otsikko sivustolla (vapaaehtoinen)"
							}
							hint={
								values.kind === "private"
									? 'Jos jätät tyhjäksi, sivustolla näkyy "Varattu".'
									: undefined
							}
							value={values.title}
							onChange={(v) => set("title", v)}
							error={errors.title}
						/>
					</div>
				)}
				<TextField
					label="Alkaa"
					type="date"
					value={values.startsOn}
					onChange={(v) => set("startsOn", v)}
					error={errors.startsOn}
				/>
				<TextField
					label="Päättyy"
					type="date"
					min={values.startsOn}
					value={values.endsOn}
					onChange={(v) => set("endsOn", v)}
					error={errors.endsOn}
				/>
				{values.kind === "public" && (
					<>
						<TextField
							label="Kellonaika (vapaaehtoinen)"
							placeholder="klo 10–16"
							value={values.time}
							onChange={(v) => set("time", v)}
							error={errors.time}
						/>
						<TextField
							label="Paikka (vapaaehtoinen)"
							placeholder="Riihimäki"
							value={values.location}
							onChange={(v) => set("location", v)}
							error={errors.location}
						/>
					</>
				)}
				<div className="md:col-span-2">
					<TextField
						multiline
						rows={4}
						label={
							values.kind === "private"
								? "Muistiinpanot (eivät näy sivustolla)"
								: values.kind === "free_weekend"
									? "Lisätieto varaussivulle (vapaaehtoinen)"
									: "Kuvaus (vapaaehtoinen)"
						}
						value={values.description}
						onChange={(v) => set("description", v)}
						error={errors.description}
					/>
				</div>
				{values.kind === "public" && (
					<div className="md:col-span-2">
						<TextField
							label="Linkki (vapaaehtoinen)"
							type="url"
							placeholder="https://…"
							hint="Esimerkiksi ilmoittautumissivu"
							value={values.link}
							onChange={(v) => set("link", v)}
							error={errors.link}
						/>
					</div>
				)}
			</div>
			<div className="mt-6 flex gap-2">
				<Button type="submit" disabled={create.isPending || update.isPending}>
					Tallenna
				</Button>
				<Button type="button" variant="outline" onClick={onDone}>
					Peruuta
				</Button>
			</div>
		</form>
	);
}

function RequestCard({ item }: { item: WeekendRequest }) {
	const { request: r, event: e } = item;
	const [note, setNote] = useState("");
	const refresh = useRefresh();
	const onDecided = (verb: string) => (res: { emailSent: boolean }) => {
		refresh();
		if (res.emailSent)
			toast.success(`${verb}. Asiakkaalle lähetettiin sähköposti.`);
		else
			toast.warning(
				`${verb}, mutta sähköpostin lähetys epäonnistui. Ota yhteyttä asiakkaaseen itse.`,
			);
	};
	const onError = (err: { message: string }) => toast.error(err.message);
	const confirm = useMutation(
		trpc.calendar.confirm.mutationOptions({
			onSuccess: onDecided("Vahvistettu, viikonloppu näkyy nyt varattuna"),
			onError,
		}),
	);
	const decline = useMutation(
		trpc.calendar.decline.mutationOptions({
			onSuccess: onDecided("Hylätty"),
			onError,
		}),
	);
	const remove = useMutation(
		trpc.calendar.removeRequest.mutationOptions({
			onSuccess: () => {
				refresh();
				toast.success("Pyyntö poistettu");
			},
			onError,
		}),
	);
	const busy = confirm.isPending || decline.isPending || remove.isPending;
	const stillFree = e.kind === "free_weekend";

	return (
		<div className="rounded-xl border border-border bg-card p-5">
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div>
					<p className="font-medium text-muted-foreground text-sm">
						{dateRange(e)}
					</p>
					<h3 className="mt-1 font-semibold text-lg">{r.name}</h3>
				</div>
				<span
					className={`rounded-full px-2.5 py-0.5 font-medium text-xs ${statusBadge[r.status]}`}
				>
					{statusLabel[r.status]}
				</span>
			</div>

			{r.emailFailed && (
				<p className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-3 text-amber-900 text-sm">
					<AlertTriangle className="size-4 shrink-0" /> Ilmoitus- tai
					kuittausviestin lähetys epäonnistui. Asiakas ei ehkä saanut
					kuittausta.
				</p>
			)}

			<dl className="mt-4 grid grid-cols-[6rem_1fr] gap-y-1.5 text-sm">
				<dt className="text-muted-foreground">Sähköposti</dt>
				<dd>
					<a
						href={`mailto:${r.email}`}
						className="inline-flex items-center gap-1 text-primary hover:underline"
					>
						<Mail className="size-3.5" /> {r.email}
					</a>
				</dd>
				<dt className="text-muted-foreground">Puhelin</dt>
				<dd>
					<a
						href={`tel:${r.phone}`}
						className="inline-flex items-center gap-1 text-primary hover:underline"
					>
						<Phone className="size-3.5" /> {r.phone}
					</a>
				</dd>
				<dt className="text-muted-foreground">Saapunut</dt>
				<dd>{dateTime(r.createdAt)}</dd>
			</dl>
			<blockquote className="mt-3 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">
				{r.message}
			</blockquote>

			{r.status === "new" && (
				<div className="mt-4">
					{!stillFree && (
						<p className="mb-3 text-amber-900 text-sm">
							Viikonloppu on jo varattu, joten tätä pyyntöä ei voi vahvistaa.
						</p>
					)}
					<Textarea
						aria-label="Lisäviesti asiakkaalle (vapaaehtoinen)"
						value={note}
						onChange={(ev) => setNote(ev.target.value)}
						rows={2}
						placeholder="Lisäviesti asiakkaalle (vapaaehtoinen)"
					/>
				</div>
			)}
			<div className="mt-3 flex flex-wrap gap-2">
				{r.status === "new" && (
					<>
						<Button
							size="sm"
							disabled={busy || !stillFree}
							onClick={() => confirm.mutate({ id: r.id, note })}
						>
							<Check /> Vahvista
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={busy}
							onClick={() => decline.mutate({ id: r.id, note })}
						>
							<X /> Hylkää
						</Button>
					</>
				)}
				<Button
					size="sm"
					variant="ghost"
					className="ml-auto"
					disabled={busy}
					onClick={() => {
						if (window.confirm(`Poistetaanko pyyntö (${r.name}) pysyvästi?`))
							remove.mutate({ id: r.id });
					}}
				>
					<Trash2 /> Poista
				</Button>
			</div>
		</div>
	);
}
