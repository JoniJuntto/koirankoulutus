import type { AppRouter } from "@koirankoulutus/api/routers/index";
import { Button } from "@koirankoulutus/ui/components/button";
import { Textarea } from "@koirankoulutus/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { AlertTriangle, Check, Mail, Phone, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { trpc } from "@/utils/trpc";

const statuses = {
	new: "Uudet",
	confirmed: "Vahvistetut",
	declined: "Hylätyt",
	all: "Kaikki",
} as const;
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

export const Route = createFileRoute("/admin/_panel/")({
	component: RequestsPage,
	validateSearch: z.object({
		tila: z
			.enum(["new", "confirmed", "declined", "all"])
			.optional()
			.catch(undefined),
		kurssi: z.number().int().optional().catch(undefined),
		id: z.number().int().optional().catch(undefined),
	}),
});

const dateTime = (d: Date | string) =>
	new Date(d).toLocaleString("fi-FI", {
		dateStyle: "short",
		timeStyle: "short",
	});

function RequestsPage() {
	const { tila = "new", kurssi, id } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const courses = useQuery(trpc.courses.adminList.queryOptions());
	const requests = useQuery(
		trpc.requests.list.queryOptions({
			status: tila === "all" ? undefined : tila,
			courseId: kurssi,
		}),
	);
	const selected = requests.data?.find((r) => r.request.id === id);

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_26rem]">
			<section className="min-w-0">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h1 className="font-semibold text-2xl">Kurssipyynnöt</h1>
					<select
						aria-label="Suodata kurssin mukaan"
						value={kurssi ?? ""}
						onChange={(e) =>
							navigate({
								search: (s) => ({
									...s,
									kurssi: e.target.value ? Number(e.target.value) : undefined,
									id: undefined,
								}),
							})
						}
						className="h-9 rounded-md border border-input bg-card px-3 text-sm"
					>
						<option value="">Kaikki kurssit</option>
						{courses.data?.map(({ course }) => (
							<option key={course.id} value={course.id}>
								{course.name}
							</option>
						))}
					</select>
				</div>
				<div className="mt-4 flex flex-wrap gap-1" role="tablist">
					{Object.entries(statuses).map(([key, label]) => (
						<button
							key={key}
							type="button"
							role="tab"
							aria-selected={tila === key}
							onClick={() =>
								navigate({
									search: (s) => ({
										...s,
										tila: key as keyof typeof statuses,
										id: undefined,
									}),
								})
							}
							className={`rounded-full px-4 py-1.5 font-medium text-sm ${tila === key ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
						>
							{label}
						</button>
					))}
				</div>

				<div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
					<table className="w-full text-left text-sm">
						<thead className="border-border border-b text-muted-foreground text-xs uppercase">
							<tr>
								<th className="px-4 py-3 font-medium">Saapunut</th>
								<th className="px-4 py-3 font-medium">Nimi</th>
								<th className="px-4 py-3 font-medium">Koira</th>
								<th className="px-4 py-3 font-medium">Kurssi</th>
								<th className="px-4 py-3 font-medium">Tila</th>
							</tr>
						</thead>
						<tbody>
							{requests.data?.map(({ request: r, courseName }) => (
								<tr
									key={r.id}
									onClick={() =>
										navigate({ search: (s) => ({ ...s, id: r.id }) })
									}
									className={`cursor-pointer border-border border-b last:border-0 hover:bg-muted/60 ${r.id === id ? "bg-secondary/70" : ""}`}
								>
									<td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
										{dateTime(r.createdAt)}
									</td>
									<td className="px-4 py-3 font-medium">
										<button type="button" className="text-left hover:underline">
											{r.name}
										</button>
										{r.emailFailed && (
											<AlertTriangle
												className="ml-1.5 inline size-4 text-amber-600"
												aria-label="Sähköposti epäonnistui"
											/>
										)}
									</td>
									<td className="px-4 py-3">
										{r.dogName}{" "}
										<span className="text-muted-foreground">
											({r.dogBreed})
										</span>
									</td>
									<td className="px-4 py-3">{courseName}</td>
									<td className="px-4 py-3">
										<span
											className={`rounded-full px-2.5 py-0.5 font-medium text-xs ${statusBadge[r.status]}`}
										>
											{statusLabel[r.status]}
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
					{requests.isPending && (
						<p className="p-6 text-muted-foreground text-sm">Ladataan…</p>
					)}
					{requests.data?.length === 0 && (
						<p className="p-6 text-muted-foreground text-sm">Ei pyyntöjä.</p>
					)}
				</div>
			</section>

			<aside className="h-fit lg:sticky lg:top-6">
				{selected ? (
					<RequestDetail
						key={selected.request.id}
						item={selected}
						onClose={() =>
							navigate({ search: (s) => ({ ...s, id: undefined }) })
						}
					/>
				) : (
					<div className="rounded-xl border border-border border-dashed p-8 text-center text-muted-foreground text-sm">
						Valitse pyyntö listasta nähdäksesi tiedot.
					</div>
				)}
			</aside>
		</div>
	);
}

type Item = inferRouterOutputs<AppRouter>["requests"]["list"][number];

function RequestDetail({ item, onClose }: { item: Item; onClose: () => void }) {
	const { request: r, courseName } = item;
	const [note, setNote] = useState("");
	const queryClient = useQueryClient();
	const refresh = () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: trpc.requests.list.pathKey() }),
			queryClient.invalidateQueries({
				queryKey: trpc.courses.adminList.queryKey(),
			}),
			queryClient.invalidateQueries({ queryKey: trpc.courses.list.queryKey() }),
		]);
	const onDecided = (verb: string) => (res: { emailSent: boolean }) => {
		refresh();
		if (res.emailSent)
			toast.success(`${verb}. Asiakkaalle lähetettiin sähköposti.`);
		else
			toast.warning(
				`${verb}, mutta sähköpostin lähetys epäonnistui. Ota yhteyttä asiakkaaseen itse.`,
			);
	};
	const onError = (e: { message: string }) => toast.error(e.message);

	const confirm = useMutation(
		trpc.requests.confirm.mutationOptions({
			onSuccess: onDecided("Vahvistettu"),
			onError,
		}),
	);
	const decline = useMutation(
		trpc.requests.decline.mutationOptions({
			onSuccess: onDecided("Hylätty"),
			onError,
		}),
	);
	const remove = useMutation(
		trpc.requests.remove.mutationOptions({
			onSuccess: () => {
				refresh();
				onClose();
				toast.success("Pyyntö poistettu");
			},
			onError,
		}),
	);
	const busy = confirm.isPending || decline.isPending || remove.isPending;

	return (
		<div className="rounded-xl border border-border bg-card p-6">
			<div className="flex items-start justify-between gap-4">
				<div>
					<span
						className={`rounded-full px-2.5 py-0.5 font-medium text-xs ${statusBadge[r.status]}`}
					>
						{statusLabel[r.status]}
					</span>
					<h2 className="mt-3 font-semibold text-xl">{r.name}</h2>
					<p className="text-muted-foreground text-sm">{courseName}</p>
				</div>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={onClose}
					aria-label="Sulje"
				>
					<X />
				</Button>
			</div>

			{r.emailFailed && (
				<p className="mt-4 flex gap-2 rounded-lg bg-amber-50 p-3 text-amber-900 text-sm">
					<AlertTriangle className="size-4 shrink-0" /> Ilmoitus- tai
					kuittausviestin lähetys epäonnistui. Asiakas ei ehkä saanut
					kuittausta.
				</p>
			)}

			<dl className="mt-5 grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
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
				<dt className="text-muted-foreground">Koira</dt>
				<dd>
					{r.dogName}, {r.dogBreed}, {r.dogAge}
				</dd>
				<dt className="text-muted-foreground">Saapunut</dt>
				<dd>{dateTime(r.createdAt)}</dd>
				{r.handledAt && (
					<>
						<dt className="text-muted-foreground">Käsitelty</dt>
						<dd>{dateTime(r.handledAt)}</dd>
					</>
				)}
			</dl>
			{r.message && (
				<blockquote className="mt-4 whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
					{r.message}
				</blockquote>
			)}

			<div className="mt-6 border-border border-t pt-5">
				<label htmlFor="note" className="font-medium text-sm">
					Lisäviesti asiakkaalle (vapaaehtoinen)
				</label>
				<Textarea
					id="note"
					value={note}
					onChange={(e) => setNote(e.target.value)}
					rows={3}
					placeholder="Liitetään vahvistus- tai hylkäysviestiin"
					className="mt-2"
				/>
				<div className="mt-4 flex flex-wrap gap-2">
					<Button
						disabled={busy || r.status === "confirmed"}
						onClick={() => confirm.mutate({ id: r.id, note })}
					>
						<Check /> Vahvista
					</Button>
					<Button
						variant="outline"
						disabled={busy || r.status === "declined"}
						onClick={() => decline.mutate({ id: r.id, note })}
					>
						<X /> Hylkää
					</Button>
					<Button
						variant="destructive"
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
				<p className="mt-3 text-muted-foreground text-xs">
					Vahvistus ja hylkäys lähettävät asiakkaalle sähköpostin. Laskun
					lähetät itse.
				</p>
			</div>
		</div>
	);
}
