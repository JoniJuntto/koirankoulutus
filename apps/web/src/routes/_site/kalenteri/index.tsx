import { dateRange, today } from "@koirankoulutus/api/format";
import {
	monthWeeks,
	overlaps,
	shiftMonth,
} from "@koirankoulutus/api/month-grid";
import type { AppRouter } from "@koirankoulutus/api/routers/index";
import { buttonVariants } from "@koirankoulutus/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { ChevronLeft, ChevronRight, ExternalLink, MapPin } from "lucide-react";
import z from "zod";

import { pageHead } from "@/lib/head";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_site/kalenteri/")({
	component: CalendarPage,
	validateSearch: z.object({
		kk: z
			.string()
			.regex(/^\d{4}-(0[1-9]|1[0-2])$/)
			.optional()
			.catch(undefined),
	}),
	head: pageHead(
		"Kalenteri",
		"Tulevat tapahtumat ja vapaat viikonloput, joille voit lähettää varauspyynnön.",
	),
});

type CalendarItem = inferRouterOutputs<AppRouter>["calendar"]["list"][number];

const weekdays = ["ma", "ti", "ke", "to", "pe", "la", "su"];

const chip = {
	public: "bg-primary/10 text-primary hover:bg-primary/20",
	private: "bg-muted text-muted-foreground",
	free_weekend:
		"bg-accent/10 text-accent ring-1 ring-accent/30 hover:bg-accent/20",
} as const;

const monthName = (month: string) => {
	const s = new Date(`${month}-01T12:00:00`).toLocaleDateString("fi-FI", {
		month: "long",
		year: "numeric",
	});
	return s.charAt(0).toUpperCase() + s.slice(1);
};

function CalendarPage() {
	const now = today();
	const { kk = now.slice(0, 7) } = Route.useSearch();
	const weeks = monthWeeks(kk);
	const from = weeks[0]?.[0] ?? `${kk}-01`;
	const to = weeks.at(-1)?.[6] ?? `${kk}-28`;
	const events = useQuery(trpc.calendar.list.queryOptions({ from, to }));
	// The list below the grid covers only this month, not the neighbours' days in the grid.
	const monthEvents =
		events.data?.filter((e) => overlaps(e, `${kk}-01`, `${kk}-31`)) ?? [];

	return (
		<div className="mx-auto max-w-6xl px-5 py-14">
			<header className="max-w-2xl">
				<p className="font-semibold text-accent text-xs uppercase tracking-[0.2em]">
					Tapahtumat ja varaukset
				</p>
				<h1 className="mt-3 font-display font-semibold text-5xl">Kalenteri</h1>
				<p className="mt-4 text-foreground/80 text-lg">
					Täältä näet tulevat tapahtumat ja vapaat viikonloput. Vapaalle
					viikonlopulle voit lähettää varauspyynnön, niin palaan asiaan
					sähköpostilla.
				</p>
			</header>

			<div className="mt-10 flex items-center justify-between gap-4">
				<h2 className="font-display font-semibold text-3xl">{monthName(kk)}</h2>
				<div className="flex gap-1">
					<Link
						to="."
						search={{ kk: shiftMonth(kk, -1) }}
						className={buttonVariants({ variant: "outline", size: "icon" })}
						aria-label="Edellinen kuukausi"
					>
						<ChevronLeft />
					</Link>
					<Link
						to="."
						search={{ kk: shiftMonth(kk, 1) }}
						className={buttonVariants({ variant: "outline", size: "icon" })}
						aria-label="Seuraava kuukausi"
					>
						<ChevronRight />
					</Link>
				</div>
			</div>

			{/* Grid on wider screens; on phones the list below is the calendar. */}
			<div className="mt-6 hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
				<div className="grid grid-cols-7 border-border border-b bg-muted/50 text-center font-medium text-muted-foreground text-xs uppercase">
					{weekdays.map((d) => (
						<div key={d} className="py-2">
							{d}
						</div>
					))}
				</div>
				{weeks.map((week) => (
					<div
						key={week[0]}
						className="grid grid-cols-7 border-border border-b last:border-0"
					>
						{week.map((day) => (
							<div
								key={day}
								className={`min-h-28 border-border border-r p-1.5 last:border-0 ${day.startsWith(kk) ? "" : "bg-muted/30 text-muted-foreground/60"}`}
							>
								<div
									className={`mb-1 flex size-6 items-center justify-center rounded-full text-xs ${day === now ? "bg-primary font-semibold text-primary-foreground" : ""}`}
								>
									{Number(day.slice(8))}
								</div>
								<div className="grid gap-1">
									{events.data
										?.filter((e) => overlaps(e, day, day))
										.map((e) => (
											<GridChip key={e.id} event={e} />
										))}
								</div>
							</div>
						))}
					</div>
				))}
			</div>

			<ul className="mt-8 grid gap-4">
				{events.isPending &&
					[0, 1].map((i) => (
						<li key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
					))}
				{monthEvents.map((e) => (
					<EventCard key={e.id} event={e} />
				))}
			</ul>
			{events.data && monthEvents.length === 0 && (
				<p className="mt-4 text-muted-foreground">
					Tälle kuukaudelle ei ole merkintöjä.
				</p>
			)}
		</div>
	);
}

function GridChip({ event: e }: { event: CalendarItem }) {
	const cls = `block truncate rounded px-1.5 py-0.5 text-left font-medium text-xs ${chip[e.kind]}`;
	if (e.kind === "free_weekend")
		return (
			<Link to="/kalenteri/varaa" search={{ id: e.id }} className={cls}>
				Vapaa – varaa
			</Link>
		);
	if (e.kind === "public")
		return (
			<a href={`#tapahtuma-${e.id}`} className={cls} title={e.title}>
				{e.time ? `${e.time} ` : ""}
				{e.title}
			</a>
		);
	return (
		<span className={cls} title={e.title}>
			{e.title}
		</span>
	);
}

function EventCard({ event: e }: { event: CalendarItem }) {
	return (
		<li
			id={`tapahtuma-${e.id}`}
			className="scroll-mt-24 rounded-2xl border border-border bg-card p-5"
		>
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="min-w-0">
					<p className="font-medium text-muted-foreground text-sm">
						{dateRange(e)}
						{e.time && ` · ${e.time}`}
					</p>
					<h3
						className={`mt-1 font-display font-semibold text-xl ${e.kind === "private" ? "text-muted-foreground" : ""}`}
					>
						{e.title}
					</h3>
					{e.location && (
						<p className="mt-1 flex items-center gap-1 text-sm">
							<MapPin className="size-3.5 text-muted-foreground" />
							{e.location}
						</p>
					)}
					{e.description && (
						<p className="mt-3 max-w-2xl whitespace-pre-line text-foreground/80 text-sm">
							{e.description}
						</p>
					)}
				</div>
				{e.kind === "free_weekend" && (
					<Link
						to="/kalenteri/varaa"
						search={{ id: e.id }}
						className={buttonVariants({ className: "rounded-full" })}
					>
						Lähetä varauspyyntö
					</Link>
				)}
				{e.link && (
					<a
						href={e.link}
						target="_blank"
						rel="noopener noreferrer"
						className={buttonVariants({
							variant: "outline",
							className: "rounded-full",
						})}
					>
						Lisätietoja <ExternalLink />
					</a>
				)}
			</div>
		</li>
	);
}
