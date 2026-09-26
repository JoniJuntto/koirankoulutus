import { buttonVariants } from "@koirankoulutus/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

import { pageHead } from "@/lib/head";
import { img } from "@/lib/site";

export const Route = createFileRoute("/_site/kurssit/kiitos")({
	component: ThanksPage,
	head: pageHead("Kiitos pyynnöstä"),
});

function ThanksPage() {
	return (
		<div className="mx-auto grid max-w-5xl items-center gap-12 px-5 py-20 md:grid-cols-[1fr_20rem]">
			<div>
				<CheckCircle2 className="size-12 text-primary" aria-hidden />
				<h1 className="mt-5 font-display font-semibold text-5xl">
					Kiitos pyynnöstäsi!
				</h1>
				<p className="mt-5 max-w-lg text-foreground/80 text-lg">
					Pyyntösi on vastaanotettu ja sait siitä kuittauksen sähköpostiisi.
					Vahvistan paikkasi sähköpostilla mahdollisimman pian. Tarkistathan
					myös roskapostikansion.
				</p>
				<div className="mt-8 flex flex-wrap gap-3">
					<Link
						to="/kurssit"
						className={buttonVariants({
							variant: "outline",
							className: "rounded-full border-foreground/25 bg-transparent",
						})}
					>
						Takaisin kursseihin
					</Link>
					<Link
						to="/"
						className={buttonVariants({
							variant: "ghost",
							className: "rounded-full",
						})}
					>
						Etusivulle
					</Link>
				</div>
			</div>
			<img
				src={img("13.jpg")}
				alt="Kaksi australianpaimenkoiraa metsässä"
				className="w-full rounded-[2rem] object-cover"
			/>
		</div>
	);
}
