import { formatDay } from "@koirankoulutus/api/format";
import { emptyDoc, type RichTextDoc } from "@koirankoulutus/api/rich-text";
import { type PostInput, postInput } from "@koirankoulutus/api/schemas";
import { Button } from "@koirankoulutus/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { fieldErrors, MoreOptions, TextField } from "@/components/admin/fields";
import { ImageField, useMediaList } from "@/components/admin/media";
import { Modal } from "@/components/admin/modal";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { PostArticle } from "@/components/post-article";
import { postStatus } from "@/lib/post-status";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/admin/_panel/blogi/$id")({
	component: PostEditorPage,
});

type Values = Omit<PostInput, "body"> & { body: RichTextDoc };

const blank = (): Values => ({
	title: "",
	slug: "",
	excerpt: "",
	body: emptyDoc(),
	coverImageId: null,
	status: "draft",
	publishedAt: null,
});

// <input type="datetime-local"> works in local time without a zone.
const toLocalInput = (iso: string | null) => {
	if (!iso) return "";
	const d = new Date(iso);
	return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
		.toISOString()
		.slice(0, 16);
};

function PostEditorPage() {
	const { id } = Route.useParams();
	const isNew = id === "uusi";
	const existing = useQuery({
		...trpc.posts.adminGet.queryOptions({ id: Number(id) }),
		enabled: !isNew,
	});
	if (!isNew && !existing.data)
		return <p className="text-muted-foreground">Ladataan…</p>;
	const p = existing.data?.post;
	const initial: Values = p
		? {
				title: p.title,
				slug: p.slug,
				excerpt: p.excerpt,
				body: p.body as Values["body"],
				coverImageId: p.coverImageId,
				status: p.status,
				publishedAt: p.publishedAt
					? new Date(p.publishedAt).toISOString()
					: null,
			}
		: blank();
	return <PostForm key={id} id={isNew ? null : Number(id)} initial={initial} />;
}

function PostForm({ id, initial }: { id: number | null; initial: Values }) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const media = useMediaList();
	const [values, setValues] = useState(initial);
	const [saved, setSaved] = useState(initial);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [preview, setPreview] = useState(false);
	const dirty = JSON.stringify(values) !== JSON.stringify(saved);
	const allowLeave = useUnsavedChanges(dirty);

	const set = <K extends keyof Values>(key: K, value: Values[K]) =>
		setValues((v) => ({ ...v, [key]: value }));

	const refresh = () =>
		Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.posts.adminList.queryKey(),
			}),
			queryClient.invalidateQueries({ queryKey: trpc.posts.list.queryKey() }),
			id &&
				queryClient.invalidateQueries({
					queryKey: trpc.posts.adminGet.queryKey({ id }),
				}),
		]);
	const onError = (e: { message: string }) => toast.error(e.message);
	const create = useMutation(trpc.posts.create.mutationOptions({ onError }));
	const update = useMutation(trpc.posts.update.mutationOptions({ onError }));
	const remove = useMutation(trpc.posts.remove.mutationOptions({ onError }));
	const pending = create.isPending || update.isPending;

	function save(status: Values["status"]) {
		const next = { ...values, status };
		const parsed = postInput.safeParse(next);
		if (!parsed.success) {
			setErrors(fieldErrors(parsed.error));
			toast.error("Tarkista punaisella merkityt kohdat.");
			return;
		}
		setErrors({});
		const message =
			status === "draft"
				? "Tallennettu luonnoksena"
				: values.status === "published"
					? "Muutokset tallennettu"
					: "Julkaistu!";
		const done = (newId?: number) => {
			setValues(next);
			setSaved(next);
			refresh();
			toast.success(message);
			if (newId) {
				allowLeave();
				navigate({
					to: "/admin/blogi/$id",
					params: { id: String(newId) },
					replace: true,
				});
			}
		};
		if (id) update.mutate({ id, ...next }, { onSuccess: () => done() });
		else create.mutate(next, { onSuccess: (row) => done(row?.id) });
	}

	const status = postStatus(saved);
	const cover = media.data?.find((m) => m.id === values.coverImageId);

	return (
		<div className="mx-auto max-w-4xl">
			<Link
				to="/admin/blogi"
				className="text-muted-foreground text-sm hover:underline"
			>
				← Kaikki kirjoitukset
			</Link>
			<div className="mt-3 flex flex-wrap items-center gap-3">
				<h1 className="font-semibold text-2xl">
					{id ? "Muokkaa kirjoitusta" : "Uusi kirjoitus"}
				</h1>
				{id && (
					<span
						className={`rounded-full px-2.5 py-0.5 font-medium text-xs ${status.className}`}
					>
						{status.label}
					</span>
				)}
				{dirty && (
					<span className="text-amber-700 text-sm">
						Tallentamattomia muutoksia
					</span>
				)}
			</div>

			<form
				className="mt-6 grid gap-6"
				onSubmit={(e) => {
					e.preventDefault();
					save(values.status);
				}}
			>
				<TextField
					label="Otsikko"
					value={values.title}
					onChange={(v) => set("title", v)}
					error={errors.title}
					className="h-11 text-lg"
				/>
				<TextField
					label="Lyhyt kuvaus"
					hint="Näkyy blogilistassa, etusivulla ja kun kirjoitus jaetaan Facebookissa. 1–2 lausetta."
					multiline
					rows={2}
					value={values.excerpt ?? ""}
					onChange={(v) => set("excerpt", v)}
					error={errors.excerpt}
				/>
				<ImageField
					label="Kansikuva"
					optional
					value={values.coverImageId}
					onChange={(v) => set("coverImageId", v)}
				/>
				<div className="grid gap-1.5">
					<span className="font-medium text-sm">Teksti</span>
					<RichTextEditor
						label="Kirjoituksen teksti"
						value={values.body}
						onChange={(doc) => set("body", doc)}
					/>
					{errors.body && (
						<p className="text-destructive text-xs">{errors.body}</p>
					)}
				</div>

				<MoreOptions>
					<TextField
						label="Julkaisuaika"
						type="datetime-local"
						hint={
							values.publishedAt
								? "Jos aika on tulevaisuudessa, kirjoitus tulee näkyviin silloin."
								: "Tyhjä = julkaistaan heti, kun painat Julkaise."
						}
						value={toLocalInput(values.publishedAt ?? null)}
						onChange={(v) =>
							set("publishedAt", v ? new Date(v).toISOString() : null)
						}
					/>
					<TextField
						label="Osoite"
						hint={
							errors.slug ??
							(values.slug
								? `Kirjoitus näkyy osoitteessa /blogi/${values.slug}. Jos muutat tätä, vanhat jaetut linkit lakkaavat toimimasta.`
								: "Tehdään otsikosta, kun tallennat.")
						}
						value={values.slug ?? ""}
						onChange={(v) => set("slug", v.toLowerCase())}
						error={errors.slug}
					/>
				</MoreOptions>

				<div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-2 border-border border-t bg-muted/95 px-5 py-3 backdrop-blur">
					{saved.status === "published" && id ? (
						<>
							<Button
								type="button"
								size="lg"
								disabled={pending}
								onClick={() => save("published")}
							>
								Tallenna muutokset
							</Button>
							<Button
								type="button"
								variant="outline"
								disabled={pending}
								onClick={() => {
									if (
										window.confirm(
											"Piilotetaanko kirjoitus sivustolta? Se jää luonnokseksi.",
										)
									)
										save("draft");
								}}
							>
								Piilota sivustolta
							</Button>
						</>
					) : (
						<>
							<Button
								type="button"
								size="lg"
								disabled={pending}
								onClick={() => save("published")}
							>
								Julkaise
							</Button>
							<Button
								type="button"
								variant="outline"
								disabled={pending}
								onClick={() => save("draft")}
							>
								Tallenna luonnos
							</Button>
						</>
					)}
					<Button
						type="button"
						variant="ghost"
						onClick={() => setPreview(true)}
					>
						<Eye /> Esikatsele
					</Button>
					{id && (
						<Button
							type="button"
							variant="ghost"
							className="ml-auto text-destructive"
							onClick={() => {
								if (
									!window.confirm(
										`Poistetaanko kirjoitus "${saved.title}" pysyvästi?`,
									)
								)
									return;
								remove.mutate(
									{ id },
									{
										onSuccess: () => {
											refresh();
											toast.success("Kirjoitus poistettu");
											allowLeave();
											navigate({ to: "/admin/blogi" });
										},
									},
								);
							}}
						>
							<Trash2 /> Poista
						</Button>
					)}
				</div>
			</form>

			<Modal
				open={preview}
				onClose={() => setPreview(false)}
				title="Esikatselu"
				className="max-w-5xl bg-background"
			>
				<PostArticle
					post={{
						title: values.title || "(Ei otsikkoa)",
						publishedAt: values.publishedAt ?? new Date(),
						coverKey: cover?.key ?? null,
						coverAlt: cover?.alt ?? null,
						body: values.body,
					}}
				/>
			</Modal>
			{saved.status === "published" && saved.slug && (
				<p className="mt-4 text-muted-foreground text-sm">
					Julkaistu {saved.publishedAt ? formatDay(saved.publishedAt) : ""}:{" "}
					<a
						href={`/blogi/${saved.slug}`}
						target="_blank"
						rel="noopener"
						className="underline"
					>
						avaa sivustolla
					</a>
				</p>
			)}
		</div>
	);
}
