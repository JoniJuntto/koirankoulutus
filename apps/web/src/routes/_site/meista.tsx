import { buttonVariants } from "@koirankoulutus/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Award } from "lucide-react";

import { pageHead } from "@/lib/head";
import { img } from "@/lib/site";

export const Route = createFileRoute("/_site/meista")({
	component: AboutPage,
	head: pageHead(
		"Kouluttaja Teija Tarkkanen",
		'Teija "Tytti" Tarkkanen: tokon koulutusohjaaja vuodesta 1995, kolme tottelevaisuusvaliota, palveluskoiralajien käyttövalioita.',
	),
});

const dogs = [
	{
		name: "Särkivaaran Nyt ja Tässä",
		age: "7 v",
		titles: "M-26 FI KVA-PKH HK3 JK3 EK2 BH",
		note: "Palveluskoirien SM-kultaa, -hopeaa ja -pronssia hakukokeessa. Yrityksen kaima.",
		image: "10.jpg",
	},
	{ name: "Ardiente Macho Ultra Fuerte", age: "5 v", titles: "JK1 BH" },
	{
		name: "Särkivaaran Oon Niin Malttamaton",
		age: "1 v",
		titles: "Nuori lupaus",
	},
];

const gallery = [
	{
		file: "2.jpg",
		alt: "Teija kahden koiran ja palkintoruusukkeiden kanssa metsässä",
	},
	{ file: "9.jpg", alt: "Koira jäljestämässä metsässä" },
	{ file: "11.jpg", alt: "Teija ja koira palkintojen kanssa hallissa" },
	{ file: "6.jpg", alt: "Koira seuraamassa tokokentällä" },
	{ file: "8.jpg", alt: "Teija halaa koiraa palkintojen keskellä" },
	{ file: "14.jpg", alt: "Musta koira kantaa ruokakuppia" },
];

function AboutPage() {
	return (
		<>
			<section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-14 pb-20 md:grid-cols-[1fr_1.1fr]">
				<img
					src={img("12.jpg")}
					alt="Teija Team Finland -takissa halaa australianpaimenkoiraa"
					className="aspect-[4/5] w-full rounded-[2rem] object-cover"
				/>
				<div>
					<p className="font-semibold text-accent text-xs uppercase tracking-[0.2em]">
						Kouluttaja
					</p>
					<h1 className="mt-3 font-display font-semibold text-5xl leading-tight">
						Teija ”Tytti” Tarkkanen
					</h1>
					<div className="mt-6 space-y-4 text-foreground/80 text-lg leading-relaxed">
						<p>
							Olen 48-vuotias koiraharrastaja Riihimäeltä. Koiria minulla on
							ollut vuodesta 1988, ja muita olen kouluttanut viikoittain omissa
							ryhmissä vuodesta 1995. Leireillä koulutan silloin tällöin, kun
							kyselyjä tulee.
						</p>
						<p>
							Pidän tärkeänä treenata myös omia koiria lajeihin, joissa koulutan
							– säilyy näppituntuma. Koirankoulutus ei ole eikä siitä koskaan
							tule päivätyötäni, koska haluan pitää sen mukavana harrastuksena.
						</p>
					</div>
				</div>
			</section>

			<section className="border-border border-y bg-card">
				<div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-3">
					<div>
						<h2 className="font-display font-semibold text-3xl">Toko</h2>
						<ul className="mt-5 space-y-3 text-foreground/80">
							<li>Tokon koulutusohjaaja vuodesta 1995</li>
							<li>Kolme itse koulutettua tottelevaisuusvaliota</li>
							<li>79 erikoisvoittajaluokan ykköstulosta</li>
							<li>Tokon maajoukkueessa 2005–2007</li>
						</ul>
					</div>
					<div>
						<h2 className="font-display font-semibold text-3xl">
							Palveluskoiralajit
						</h2>
						<ul className="mt-5 space-y-3 text-foreground/80">
							<li>
								Kolmosluokan kokeet omakouluttamalla koiralla etsinnässä,
								jäljellä, haussa ja viestissä
							</li>
							<li>Käyttövaliot viestistä ja hakukokeesta</li>
						</ul>
					</div>
					<div>
						<h2 className="font-display font-semibold text-3xl">Ansiomerkit</h2>
						<ul className="mt-5 space-y-3 text-foreground/80">
							{[
								"Palveluskoirien hopeinen ansiomerkki",
								"Australianpaimenkoirat ry:n hopeinen ansiomerkki",
								"Suursnautserien pronssinen harrastusmerkki – vaikka en ole koskaan omistanut tai ohjannut rodun koiraa",
							].map((m) => (
								<li key={m} className="flex gap-3">
									<Award
										className="mt-1 size-4 shrink-0 text-accent"
										aria-hidden
									/>
									{m}
								</li>
							))}
						</ul>
					</div>
				</div>
			</section>

			<section className="mx-auto max-w-6xl px-5 py-20">
				<div className="max-w-2xl">
					<h2 className="font-display font-semibold text-4xl">
						Kotona asuvat koirat
					</h2>
					<p className="mt-4 text-foreground/80 text-lg">
						Olen kasvattanut australianpaimenkoiria vuodesta 2001 kennelnimellä
						Särkivaaran. Kotona asuu nyt neljännen ja viidennen polven omia
						koiria.
					</p>
				</div>
				<div className="mt-10 grid items-start gap-6 md:grid-cols-3">
					{dogs.map((d) => (
						<article
							key={d.name}
							className="overflow-hidden rounded-2xl border border-border bg-card"
						>
							{d.image && (
								<img
									src={img(d.image)}
									alt={d.name}
									loading="lazy"
									className="aspect-[4/3] w-full object-cover"
								/>
							)}
							<div className="p-6">
								<h3 className="font-display font-semibold text-xl">{d.name}</h3>
								<p className="mt-1 text-muted-foreground text-sm">
									Australianpaimenkoira, {d.age}
								</p>
								<p className="mt-3 font-mono text-primary text-xs tracking-tight">
									{d.titles}
								</p>
								{d.note && <p className="mt-3 text-sm">{d.note}</p>}
							</div>
						</article>
					))}
				</div>
			</section>

			<section className="mx-auto max-w-6xl px-5">
				<h2 className="sr-only">Kuvia</h2>
				<div className="columns-2 gap-4 md:columns-3 [&>img]:mb-4">
					{gallery.map((g) => (
						<img
							key={g.file}
							src={img(g.file)}
							alt={g.alt}
							loading="lazy"
							className="w-full rounded-2xl"
						/>
					))}
				</div>
				<div className="mt-12 text-center">
					<Link
						to="/kurssit"
						className={buttonVariants({
							size: "lg",
							className: "rounded-full",
						})}
					>
						Katso tulevat kurssit
					</Link>
				</div>
			</section>
		</>
	);
}
