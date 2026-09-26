import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";

import { pageHead } from "@/lib/head";
import { contact, img } from "@/lib/site";

export const Route = createFileRoute("/_site/yhteystiedot")({
	component: ContactPage,
	head: pageHead("Yhteystiedot"),
});

function ContactPage() {
	const items = [
		{
			icon: Phone,
			label: "Puhelin",
			value: contact.phone,
			href: contact.phoneHref,
		},
		{
			icon: Mail,
			label: "Sähköposti",
			value: contact.email,
			href: `mailto:${contact.email}`,
		},
		{
			icon: MapPin,
			label: "Sijainti",
			value: "Riihimäki – kurssit pidetään verkossa",
		},
	];
	return (
		<div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 md:grid-cols-2">
			<div>
				<p className="font-semibold text-accent text-xs uppercase tracking-[0.2em]">
					Ota yhteyttä
				</p>
				<h1 className="mt-3 font-display font-semibold text-5xl">
					Yhteystiedot
				</h1>
				<p className="mt-4 max-w-md text-foreground/80 text-lg">
					Kysy kursseista tai koirasi koulutuksesta. Vastaan yleensä muutaman
					päivän sisällä – koulutus on minulle harrastus, joten iltaisin
					tavoittaa parhaiten.
				</p>
				<ul className="mt-10 space-y-6">
					{items.map((i) => (
						<li key={i.label} className="flex items-center gap-4">
							<span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
								<i.icon className="size-5" aria-hidden />
							</span>
							<div>
								<p className="text-muted-foreground text-sm">{i.label}</p>
								{i.href ? (
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
				<a
					href={contact.facebook}
					target="_blank"
					rel="noreferrer"
					className="mt-10 inline-block font-medium text-primary underline underline-offset-4"
				>
					Seuraa Facebookissa: koirankoulutus Nyt ja Tässä
				</a>
				<p className="mt-8 text-muted-foreground text-sm">
					Y-tunnus {contact.businessId}
				</p>
			</div>
			<img
				src={img("1.jpg")}
				alt="Teija metsässä ämpärit kädessä"
				className="aspect-[4/5] w-full rounded-[2rem] object-cover"
			/>
		</div>
	);
}
