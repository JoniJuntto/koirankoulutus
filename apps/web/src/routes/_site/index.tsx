import { buttonVariants } from "@koirankoulutus/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Laptop, MailCheck, MousePointerClick } from "lucide-react";

import CourseCard from "@/components/course-card";
import { img } from "@/lib/site";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_site/")({
	component: HomePage,
	head: () => ({
		meta: [
			{ title: "koirankoulutus Nyt ja Tässä – Teija Tarkkanen, Riihimäki" },
		],
	}),
});

const steps = [
	{
		icon: MousePointerClick,
		title: "Valitse kurssi",
		text: "Katso tulevat kurssit ja valitse koirallesi sopiva.",
	},
	{
		icon: MailCheck,
		title: "Lähetä pyyntö",
		text: "Täytä lyhyt lomake. Vahvistan paikan sähköpostilla.",
	},
	{
		icon: Laptop,
		title: "Treenataan",
		text: "Liity Zoomiin tai Teamsiin kotoa. Lasku tulee erikseen.",
	},
];

function HomePage() {
	const courses = useQuery(trpc.courses.list.queryOptions());

	return (
		<>
			<section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pt-10 pb-16 md:grid-cols-[1.1fr_1fr] md:pt-16">
				<div>
					<h1 className="mt-4 text-balance font-display font-semibold text-5xl leading-[1.05] sm:text-6xl">
						Koirankoulutusta <em className="text-primary">nyt ja tässä</em>.
					</h1>
					<p className="mt-6 max-w-xl text-foreground/80 text-lg leading-relaxed">
						Olen Teija "Tytti" Tarkkanen. Olen kouluttanut koiria ja niiden
						ohjaajia vuodesta 1995 – tokossa kolme tottelevaisuusvaliota,
						palveluskoiralajeissa käyttövalioita. Verkkokursseilla treenaat oman
						koirasi kanssa kotona, ohjattuna.
					</p>
					<div className="mt-8 flex flex-wrap gap-3">
						<Link
							to="/kurssit"
							className={buttonVariants({
								size: "lg",
								className: "rounded-full",
							})}
						>
							Katso kurssit <ArrowRight />
						</Link>
						<Link
							to="/meista"
							className={buttonVariants({
								size: "lg",
								variant: "outline",
								className: "rounded-full border-foreground/25 bg-transparent",
							})}
						>
							Tutustu kouluttajaan
						</Link>
					</div>
				</div>
				<div className="relative">
					<div
						className="absolute -inset-3 -z-10 translate-x-4 translate-y-4 rounded-[2rem] bg-secondary"
						aria-hidden
					/>
					<img
						src={img("7.jpg")}
						alt="Teija ja australianpaimenkoira seuraamassa tokokentällä"
						className="aspect-[4/5] w-full rounded-[2rem] object-cover"
						fetchPriority="high"
					/>
				</div>
			</section>

			<section className="mx-auto max-w-6xl px-5 py-20">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<h2 className="font-display font-semibold text-4xl">
							Tulevat kurssit
						</h2>
						<p className="mt-2 text-muted-foreground">
							Pienet ryhmät, selkeät kotitehtävät.
						</p>
					</div>
					<Link
						to="/kurssit"
						className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
					>
						Kaikki kurssit <ArrowRight className="size-4" />
					</Link>
				</div>
				<div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{courses.isPending &&
						[0, 1, 2].map((i) => (
							<div
								key={i}
								className="h-[30rem] animate-pulse rounded-2xl bg-muted"
							/>
						))}
					{courses.data?.slice(0, 3).map((c) => (
						<CourseCard key={c.id} course={c} />
					))}
					{courses.data?.length === 0 && (
						<p className="text-muted-foreground">
							Uusia kursseja julkaistaan pian. Seuraa Facebookissa!
						</p>
					)}
				</div>
			</section>

			<section className="bg-secondary/60">
				<div className="mx-auto max-w-6xl px-5 py-20">
					<h2 className="font-display font-semibold text-4xl">
						Näin kurssille pääsee
					</h2>
					<ol className="mt-10 grid gap-6 md:grid-cols-3">
						{steps.map((s, i) => (
							<li key={s.title} className="rounded-2xl bg-card p-7 shadow-sm">
								<div className="flex items-center gap-3">
									<span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
										<s.icon className="size-5" aria-hidden />
									</span>
									<span className="font-display text-lg text-muted-foreground italic">
										{i + 1}.
									</span>
								</div>
								<h3 className="mt-5 font-semibold text-lg">{s.title}</h3>
								<p className="mt-2 text-muted-foreground">{s.text}</p>
							</li>
						))}
					</ol>
				</div>
			</section>

			<section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-24 md:grid-cols-2">
				<img
					src={img("5.jpg")}
					alt="Australianpaimenkoira tuo noutokapulaa nurmikentällä"
					loading="lazy"
					className="aspect-square w-full rounded-[2rem] object-cover"
				/>
				<figure>
					<blockquote className="text-balance font-display text-3xl italic leading-snug sm:text-4xl">
						”Pidän tärkeänä treenata myös omia koiria lajeihin, joissa koulutan.
						Säilyy näppituntuma.”
					</blockquote>
					<figcaption className="mt-6 text-muted-foreground">
						— Teija "Tytti" Tarkkanen
					</figcaption>
					<Link
						to="/meista"
						className={buttonVariants({
							variant: "outline",
							className:
								"mt-8 rounded-full border-foreground/25 bg-transparent",
						})}
					>
						Lue lisää Teijasta
					</Link>
				</figure>
			</section>

			<section className="mx-auto max-w-6xl px-5">
				<div className="relative overflow-hidden rounded-[2rem] bg-accent px-8 py-14 text-accent-foreground sm:px-14">
					<h2 className="max-w-lg text-balance font-display font-semibold text-4xl">
						Löytyikö sopiva kurssi?
					</h2>
					<p className="mt-3 max-w-lg opacity-90">
						Lähetä pyyntö, niin vahvistan paikkasi sähköpostilla. Pyyntö ei
						vielä sido sinua mihinkään.
					</p>
					<Link
						to="/kurssit/varaa"
						className={buttonVariants({
							size: "lg",
							className:
								"mt-8 rounded-full bg-background text-foreground hover:bg-background/90",
						})}
					>
						Varaa kurssi
					</Link>
				</div>
			</section>
		</>
	);
}
