import { formatDate, formatPrice, mediaUrl } from "@koirankoulutus/api/format";
import type { AppRouter } from "@koirankoulutus/api/routers/index";
import { buttonVariants } from "@koirankoulutus/ui/components/button";
import { Link } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { CalendarDays, Clock, MonitorPlay, Users } from "lucide-react";

export type PublicCourse =
	inferRouterOutputs<AppRouter>["courses"]["list"][number];

export function spotsLeft(c: PublicCourse) {
	return Math.max(0, c.maxParticipants - c.confirmed);
}

export default function CourseCard({
	course,
	full = false,
}: {
	course: PublicCourse;
	full?: boolean;
}) {
	const left = spotsLeft(course);
	return (
		<article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
			<div className="relative aspect-[4/3] overflow-hidden">
				<img
					src={mediaUrl(course.imageKey)}
					alt={course.imageAlt}
					loading="lazy"
					className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
				/>
				<span className="absolute top-3 left-3 rounded-full bg-background/90 px-3 py-1 font-semibold text-primary text-xs">
					{formatPrice(course.priceCents)}
				</span>
			</div>
			<div className="flex flex-1 flex-col gap-4 p-6">
				<div>
					<h3 className="font-display font-semibold text-2xl leading-tight">
						{course.name}
					</h3>
					<p className="mt-1 text-muted-foreground text-sm">
						{course.targetGroup}
					</p>
				</div>
				{full && (
					<p className="text-sm leading-relaxed">{course.description}</p>
				)}
				<ul className="grid gap-2 text-sm">
					<li className="flex items-center gap-2">
						<CalendarDays className="size-4 text-primary" aria-hidden /> Alkaa{" "}
						{formatDate(course.startsOn)}
					</li>
					<li className="flex items-center gap-2">
						<Clock className="size-4 text-primary" aria-hidden />{" "}
						{course.schedule}, {course.sessions} kertaa
					</li>
					<li className="flex items-center gap-2">
						<MonitorPlay className="size-4 text-primary" aria-hidden />{" "}
						{course.platform}
					</li>
					<li className="flex items-center gap-2">
						<Users className="size-4 text-primary" aria-hidden />
						{left > 0
							? `${left} / ${course.maxParticipants} paikkaa vapaana`
							: "Täynnä – voit jättää varasijapyynnön"}
					</li>
				</ul>
				<Link
					to="/kurssit/varaa"
					search={{ kurssi: course.slug }}
					className={buttonVariants({
						variant: left > 0 ? "default" : "outline",
						className: "mt-auto w-full rounded-full",
					})}
				>
					{left > 0 ? "Varaa paikka" : "Jätä varasijapyyntö"}
				</Link>
			</div>
		</article>
	);
}
