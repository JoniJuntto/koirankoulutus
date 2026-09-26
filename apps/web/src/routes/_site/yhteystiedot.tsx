import { mediaUrl } from "@koirankoulutus/api/format";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";

import { pageHead } from "@/lib/head";
import { loadPage } from "@/lib/load-page";
import { Paragraphs } from "@/lib/paragraphs";
import { RichText } from "@/lib/rich-text";
import { useSettings } from "@/lib/settings";
import { phoneHref } from "@/lib/site";

export const Route = createFileRoute("/_site/yhteystiedot")({
	component: ContactPage,
	loader: ({ context }) => loadPage(context, "yhteystiedot"),
	head: ({ loaderData }) =>
		pageHead(
			loaderData?.page.title ?? "Yhteystiedot",
			loaderData?.page.description,
		)(),
});

function ContactPage() {
	const { page, heroKey, heroAlt } = Route.useLoaderData();
	const s = useSettings();
	const items = [
		s.phone && {
			icon: Phone,
			label: "Puhelin",
			value: s.phone,
			href: phoneHref(s.phone),
		},
		s.email && {
			icon: Mail,
			label: "Sähköposti",
			value: s.email,
			href: `mailto:${s.email}`,
		},
		{
			icon: MapPin,
			label: "Sijainti",
			value: "Riihimäki – kurssit pidetään verkossa",
		},
	].filter((i) => !!i);

	return (
		<div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 md:grid-cols-2">
			<div>
				<p className="font-semibold text-accent text-xs uppercase tracking-[0.2em]">
					Ota yhteyttä
				</p>
				<h1 className="mt-3 font-display font-semibold text-5xl">
					{page.title}
				</h1>
				<Paragraphs
					text={page.intro}
					className="mt-4 max-w-md space-y-4 text-foreground/80 text-lg"
				/>
				<ul className="mt-10 space-y-6">
					{items.map((i) => (
						<li key={i.label} className="flex items-center gap-4">
							<span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
								<i.icon className="size-5" aria-hidden />
							</span>
							<div>
								<p className="text-muted-foreground text-sm">{i.label}</p>
								{"href" in i && i.href ? (
									<a
										href={i.href}
										className="font-medium text-lg hover:text-primary"
									>
										{i.value}
									</a>
								) : (
									<p className="font-medium text-lg">{i.value}</p>
								)}
							</div>
						</li>
					))}
				</ul>
				{s.facebook && (
					<a
						href={s.facebook}
						target="_blank"
						rel="noreferrer"
						className="mt-10 inline-block font-medium text-primary underline underline-offset-4"
					>
						Seuraa Facebookissa: koirankoulutus Nyt ja Tässä
					</a>
				)}
				<RichText doc={page.body} className="mt-8" />
				{s.businessId && (
					<p className="mt-8 text-muted-foreground text-sm">
						Y-tunnus {s.businessId}
					</p>
				)}
			</div>
			{heroKey && (
				<img
					src={mediaUrl(heroKey)}
					alt={heroAlt ?? ""}
					className="aspect-[4/5] w-full rounded-[2rem] object-cover"
				/>
			)}
		</div>
	);
}
