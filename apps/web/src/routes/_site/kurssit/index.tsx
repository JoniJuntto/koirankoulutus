import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import CourseCard from "@/components/course-card";
import { pageHead } from "@/lib/head";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_site/kurssit/")({
	component: CoursesPage,
	head: pageHead(
		"Kurssit",
		"Tulevat koirankoulutuksen verkkokurssit: TOKO, jäljestys, arjen tottelevaisuus.",
	),
});

function CoursesPage() {
	const courses = useQuery(trpc.courses.list.queryOptions());

	return (
		<div className="mx-auto max-w-6xl px-5 py-14">
			<header className="max-w-2xl">
				<p className="font-semibold text-accent text-xs uppercase tracking-[0.2em]">
					Verkkokurssit
				</p>
				<h1 className="mt-3 font-display font-semibold text-5xl">Kurssit</h1>
				<p className="mt-4 text-foreground/80 text-lg">
					Kurssit pidetään etänä Zoomissa tai Teamsissa. Tarvitset puhelimen tai
					tietokoneen, koirasi ja vähän tilaa treenata. Jokaisen kerran jälkeen
					saat kotitehtävät seuraavaan kertaan.
				</p>
			</header>
			<div className="mt-12 grid gap-6 md:grid-cols-2">
				{courses.isPending &&
					[0, 1].map((i) => (
						<div
							key={i}
							className="h-[36rem] animate-pulse rounded-2xl bg-muted"
						/>
					))}
				{courses.data?.map((c) => (
					<CourseCard key={c.id} course={c} full />
				))}
			</div>
			{courses.data?.length === 0 && (
				<p className="mt-6 text-muted-foreground">
					Uusia kursseja julkaistaan pian. Seuraa Facebookissa!
				</p>
			)}
		</div>
	);
}
