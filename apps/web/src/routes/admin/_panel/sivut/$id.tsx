import { emptyDoc, type RichTextDoc } from "@koirankoulutus/api/rich-text";
import { type PageInput, pageInput } from "@koirankoulutus/api/schemas";
import { Button } from "@koirankoulutus/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ExternalLink, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
	fieldErrors,
	MoreOptions,
	TextField,
	Toggle,
} from "@/components/admin/fields";
import { GalleryField, ImageField } from "@/components/admin/media";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { allPageFields, systemPageInfo } from "@/lib/system-pages";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/admin/_panel/sivut/$id")({
	component: PageEditorPage,
});

type Values = Omit<PageInput, "body"> & { body: RichTextDoc };

const blank = (): Values => ({
	title: "",
	slug: "",
	description: "",
	intro: "",
	body: emptyDoc(),
	heroImageId: null,
	galleryIds: [],
	inFooter: true,
	published: true,
});

function PageEditorPage() {
	const { id } = Route.useParams();
	const isNew = id === "uusi";
	const existing = useQuery({
		...trpc.pages.adminGet.queryOptions({ id: Number(id) }),
		enabled: !isNew,
	});
	if (!isNew && !existing.data)
		return <p className="text-muted-foreground">Ladataan…</p>;
	const p = existing.data;
	const initial: Values = p
		? {
				title: p.title,
				slug: p.slug,
				description: p.description,
				intro: p.intro,
				body: p.body as Values["body"],
				heroImageId: p.heroImageId,
				galleryIds: p.galleryIds,
				inFooter: p.inFooter,
				published: p.published,
			}
		: blank();
	return (
		<PageForm
			key={id}
			id={isNew ? null : Number(id)}
			system={p?.system ? p.slug : null}
			initial={initial}
		/>
	);
}

function PageForm({
	id,
	system,
	initial,
}: {
	id: number | null;
	system: string | null;
	initial: Values;
}) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [values, setValues] = useState(initial);
	const [saved, setSaved] = useState(initial);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const dirty = JSON.stringify(values) !== JSON.stringify(saved);
	const allowLeave = useUnsavedChanges(dirty);
	const info = system ? systemPageInfo[system] : undefined;
	const fields = info?.fields ?? allPageFields;

	const set = <K extends keyof Values>(key: K, value: Values[K]) =>
		setValues((v) => ({ ...v, [key]: value }));

	const refresh = () =>
		queryClient.invalidateQueries({ queryKey: trpc.pages.pathKey() });
	const onError = (e: { message: string }) => toast.error(e.message);
	const create = useMutation(trpc.pages.create.mutationOptions({ onError }));
	const update = useMutation(trpc.pages.update.mutationOptions({ onError }));
	const remove = useMutation(trpc.pages.remove.mutationOptions({ onError }));

	function save() {
		const parsed = pageInput.safeParse(values);
		if (!parsed.success) {
			setErrors(fieldErrors(parsed.error));
			toast.error("Tarkista punaisella merkityt kohdat.");
			return;
		}
		setErrors({});
		if (id)
			update.mutate(
				{ id, ...values },
				{
					onSuccess: ({ slug }) => {
						const next = { ...values, slug };
						setValues(next);
						setSaved(next);
						refresh();
						toast.success("Sivu tallennettu");
					},
				},
			);
		else
			create.mutate(values, {
				onSuccess: (row) => {
					refresh();
					toast.success("Sivu luotu");
					allowLeave();
					if (row)
						navigate({
							to: "/admin/sivut/$id",
							params: { id: String(row.id) },
							replace: true,
						});
				},
			});
	}

	const publicPath = saved.slug ? `/${saved.slug}` : null;

	return (
		<div className="mx-auto max-w-4xl">
			<Link
				to="/admin/sivut"
				className="text-muted-foreground text-sm hover:underline"
			>
				← Kaikki sivut
			</Link>
			<div className="mt-3 flex flex-wrap items-center gap-3">
				<h1 className="font-semibold text-2xl">
					{info?.name ?? (id ? "Muokkaa sivua" : "Uusi sivu")}
				</h1>
				{dirty && (
					<span className="text-amber-700 text-sm">
						Tallentamattomia muutoksia
					</span>
				)}
				{id && publicPath && saved.published && (
					<a
						href={publicPath}
						target="_blank"
						rel="noopener"
						className="ml-auto inline-flex items-center gap-1 text-primary text-sm hover:underline"
					>
						Avaa sivustolla <ExternalLink className="size-3.5" />
					</a>
				)}
			</div>
			{info && (
				<p className="mt-1 text-muted-foreground text-sm">{info.hint}</p>
			)}

			<form
				className="mt-6 grid gap-6"
				onSubmit={(e) => {
					e.preventDefault();
					save();
				}}
			>
				<TextField
					label="Otsikko"
					value={values.title}
					onChange={(v) => set("title", v)}
					error={errors.title}
					className="h-11 text-lg"
				/>
				{fields.includes("intro") && (
					<TextField
						label="Johdanto"
						hint="Lyhyt teksti otsikon alla. Tyhjä rivi aloittaa uuden kappaleen."
						multiline
						rows={4}
						value={values.intro ?? ""}
						onChange={(v) => set("intro", v)}
						error={errors.intro}
					/>
				)}
				{fields.includes("hero") && (
					<ImageField
						label="Pääkuva"
						optional
						value={values.heroImageId}
						onChange={(v) => set("heroImageId", v)}
					/>
				)}
				{fields.includes("body") && (
					<div className="grid gap-1.5">
						<span className="font-medium text-sm">Sisältö</span>
						<RichTextEditor
							label="Sivun sisältö"
							value={values.body}
							onChange={(doc) => set("body", doc)}
						/>
						{errors.body && (
							<p className="text-destructive text-xs">{errors.body}</p>
						)}
					</div>
				)}
				{fields.includes("gallery") && (
					<GalleryField
						value={values.galleryIds ?? []}
						onChange={(v) => set("galleryIds", v)}
					/>
				)}
				{!system && (
					<div className="grid gap-3 rounded-xl border border-border bg-card p-4">
						<Toggle
							label="Näkyvissä sivustolla"
							checked={values.published ?? true}
							onChange={(v) => set("published", v)}
						/>
						<Toggle
							label="Näytä linkki sivuston alalaidassa"
							hint="Muuten sivulle pääsee vain linkistä, jonka lisäät itse esim. blogiin."
							checked={values.inFooter ?? false}
							onChange={(v) => set("inFooter", v)}
						/>
					</div>
				)}

				<MoreOptions>
					<TextField
						label="Kuvaus hakukoneille"
						hint="Näkyy Googlen hakutuloksissa ja Facebook-jaossa. Tyhjä = käytetään johdantoa."
						multiline
						rows={2}
						value={values.description ?? ""}
						onChange={(v) => set("description", v)}
						error={errors.description}
					/>
					{!system && (
						<TextField
							label="Osoite"
							hint={
								errors.slug ??
								(values.slug
									? `Sivu näkyy osoitteessa /${values.slug}. Jos muutat tätä, vanhat linkit lakkaavat toimimasta.`
									: "Tehdään otsikosta, kun tallennat.")
							}
							value={values.slug ?? ""}
							onChange={(v) => set("slug", v.toLowerCase())}
							error={errors.slug}
						/>
					)}
				</MoreOptions>

				<div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-2 border-border border-t bg-muted/95 px-5 py-3 backdrop-blur">
					<Button
						type="submit"
						size="lg"
						disabled={create.isPending || update.isPending}
					>
						{id ? "Tallenna" : "Luo sivu"}
					</Button>
					{id && !system && (
						<Button
							type="button"
							variant="ghost"
							className="ml-auto text-destructive"
							onClick={() => {
								if (
									!window.confirm(
										`Poistetaanko sivu "${saved.title}" pysyvästi?`,
									)
								)
									return;
								remove.mutate(
									{ id },
									{
										onSuccess: () => {
											refresh();
											toast.success("Sivu poistettu");
											allowLeave();
											navigate({ to: "/admin/sivut" });
										},
									},
								);
							}}
						>
							<Trash2 /> Poista sivu
						</Button>
					)}
				</div>
			</form>
		</div>
	);
}
