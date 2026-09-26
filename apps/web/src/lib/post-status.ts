import { formatDay } from "@koirankoulutus/api/format";

export function postStatus(p: {
	status: "draft" | "published";
	publishedAt: Date | string | null;
}) {
	if (p.status === "draft")
		return { label: "Luonnos", className: "bg-muted text-muted-foreground" };
	if (p.publishedAt && new Date(p.publishedAt) > new Date())
		return {
			label: `Ajastettu ${formatDay(p.publishedAt)}`,
			className: "bg-amber-100 text-amber-900",
		};
	return { label: "Julkaistu", className: "bg-secondary text-primary" };
}
