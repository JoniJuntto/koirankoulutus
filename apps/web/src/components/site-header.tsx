import { buttonVariants } from "@koirankoulutus/ui/components/button";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
	{ to: "/kurssit", label: "Kurssit" },
	{ to: "/meista", label: "Kouluttaja" },
	{ to: "/yhteystiedot", label: "Yhteystiedot" },
] as const;

export function Logo() {
	return (
		<Link to="/" className="group flex flex-col leading-none">
			<span className="font-semibold text-[0.65rem] text-muted-foreground uppercase tracking-[0.2em]">
				koirankoulutus
			</span>
			<span className="font-display font-semibold text-2xl text-primary italic">
				Nyt ja Tässä
			</span>
		</Link>
	);
}

export default function SiteHeader() {
	const [open, setOpen] = useState(false);
	return (
		<header className="sticky top-0 z-30 border-border/70 border-b bg-background/90 backdrop-blur">
			<div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3">
				<Logo />
				<nav
					className="hidden items-center gap-7 md:flex"
					aria-label="Päävalikko"
				>
					{links.map((l) => (
						<Link
							key={l.to}
							to={l.to}
							className="font-medium text-foreground/80 text-sm hover:text-primary"
							activeProps={{
								className:
									"text-primary underline underline-offset-8 decoration-2",
							}}
						>
							{l.label}
						</Link>
					))}
					<Link
						to="/kurssit/varaa"
						className={buttonVariants({ className: "rounded-full" })}
					>
						Varaa kurssi
					</Link>
				</nav>
				<button
					type="button"
					className="rounded-md p-2 md:hidden"
					aria-label={open ? "Sulje valikko" : "Avaa valikko"}
					aria-expanded={open}
					onClick={() => setOpen(!open)}
				>
					{open ? <X /> : <Menu />}
				</button>
			</div>
			{open && (
				<nav
					className="border-border/70 border-t px-5 pb-5 md:hidden"
					aria-label="Päävalikko"
				>
					<ul className="flex flex-col">
						{links.map((l) => (
							<li key={l.to}>
								<Link
									to={l.to}
									onClick={() => setOpen(false)}
									className="block py-3 font-medium text-base"
								>
									{l.label}
								</Link>
							</li>
						))}
					</ul>
					<Link
						to="/kurssit/varaa"
						onClick={() => setOpen(false)}
						className={buttonVariants({
							size: "lg",
							className: "mt-2 w-full rounded-full",
						})}
					>
						Varaa kurssi
					</Link>
				</nav>
			)}
		</header>
	);
}
