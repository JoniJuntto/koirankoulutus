import { formatDate, formatPrice } from "@koirankoulutus/api/format";
import type { AppRouter } from "@koirankoulutus/api/routers/index";
import { type CourseInput, courseInput } from "@koirankoulutus/api/schemas";
import { Button } from "@koirankoulutus/ui/components/button";
import { Input } from "@koirankoulutus/ui/components/input";
import { Label } from "@koirankoulutus/ui/components/label";
import { Textarea } from "@koirankoulutus/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { courseImages, img } from "@/lib/site";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/admin/_panel/kurssit")({
	component: CoursesAdminPage,
});

type Course =
	inferRouterOutputs<AppRouter>["courses"]["adminList"][number]["course"];

const empty: CourseInput = {
	slug: "",
	name: "",
	description: "",
	targetGroup: "",
	startsOn: new Date().toISOString().slice(0, 10),
	schedule: "",
	sessions: 4,
	platform: "Zoom",
	priceCents: 5900,
	maxParticipants: 10,
	image: "4.jpg",
	published: true,
};

const slugify = (s: string) =>
	s
		.toLowerCase()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");

function CoursesAdminPage() {
	const courses = useQuery(trpc.courses.adminList.queryOptions());
	const [editing, setEditing] = useState<Course | "new" | null>(null);
	const queryClient = useQueryClient();
	const refresh = () =>
		Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.courses.adminList.queryKey(),
			}),
			queryClient.invalidateQueries({ queryKey: trpc.courses.list.queryKey() }),
		]);
	const onError = (e: { message: string }) => toast.error(e.message);

	const setPublished = useMutation(
		trpc.courses.setPublished.mutationOptions({ onSuccess: refresh, onError }),
	);
	const remove = useMutation(
		trpc.courses.remove.mutationOptions({
			onSuccess: () => {
				refresh();
				toast.success("Kurssi poistettu");
			},
			onError,
		}),
	);

	return (
		<div>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="font-semibold text-2xl">Kurssit</h1>
				{!editing && (
					<Button onClick={() => setEditing("new")}>
						<Plus /> Uusi kurssi
					</Button>
				)}
			</div>

			{editing && (
				<CourseForm
					key={editing === "new" ? "new" : editing.id}
					course={editing === "new" ? null : editing}
					onDone={() => {
						setEditing(null);
						refresh();
					}}
				/>
			)}

			<div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
				<table className="w-full text-left text-sm">
					<thead className="border-border border-b text-muted-foreground text-xs uppercase">
						<tr>
							<th className="px-4 py-3 font-medium">Kurssi</th>
							<th className="px-4 py-3 font-medium">Alkaa</th>
							<th className="px-4 py-3 font-medium">Hinta</th>
							<th className="px-4 py-3 font-medium">Vahvistettu</th>
							<th className="px-4 py-3 font-medium">Uusia</th>
							<th className="px-4 py-3 font-medium">Näkyvissä</th>
							<th className="px-4 py-3" />
						</tr>
					</thead>
					<tbody>
						{courses.data?.map(({ course: c, confirmed, pending }) => (
							<tr key={c.id} className="border-border border-b last:border-0">
								<td className="px-4 py-3">
									<div className="flex items-center gap-3">
										<img
											src={img(c.image)}
											alt=""
											className="size-10 rounded-md object-cover"
										/>
										<span className="font-medium">{c.name}</span>
									</div>
								</td>
								<td className="whitespace-nowrap px-4 py-3">
									{formatDate(c.startsOn)}
								</td>
								<td className="whitespace-nowrap px-4 py-3">
									{formatPrice(c.priceCents)}
								</td>
								<td className="px-4 py-3">
									<span
										className={
											confirmed >= c.maxParticipants
												? "font-semibold text-accent"
												: ""
										}
									>
										{confirmed} / {c.maxParticipants}
									</span>
								</td>
								<td className="px-4 py-3">
									{pending > 0 ? (
										<Link
											to="/admin"
											search={{ tila: "new", kurssi: c.id }}
											className="rounded-full bg-amber-100 px-2.5 py-0.5 font-medium text-amber-900 text-xs hover:underline"
										>
											{pending} uutta
										</Link>
									) : (
										<span className="text-muted-foreground">–</span>
									)}
								</td>
								<td className="px-4 py-3">
									<input
										type="checkbox"
										aria-label={`${c.name} näkyvissä sivustolla`}
										checked={c.published}
										onChange={(e) =>
											setPublished.mutate({
												id: c.id,
												published: e.target.checked,
											})
										}
										className="size-4 accent-[var(--primary)]"
									/>
								</td>
								<td className="px-4 py-3">
									<div className="flex justify-end gap-1">
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label={`Muokkaa ${c.name}`}
											onClick={() => setEditing(c)}
										>
											<Pencil />
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label={`Poista ${c.name}`}
											onClick={() => {
												if (window.confirm(`Poistetaanko kurssi "${c.name}"?`))
													remove.mutate({ id: c.id });
											}}
										>
											<Trash2 />
										</Button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
				{courses.data?.length === 0 && (
					<p className="p-6 text-muted-foreground text-sm">
						Ei kursseja vielä.
					</p>
				)}
			</div>
		</div>
	);
}

function CourseForm({
	course,
	onDone,
}: {
	course: Course | null;
	onDone: () => void;
}) {
	const [values, setValues] = useState<CourseInput>(
		course ? { ...empty, ...course } : empty,
	);
	const [slugTouched, setSlugTouched] = useState(!!course);
	const [errors, setErrors] = useState<
		Partial<Record<keyof CourseInput, string>>
	>({});
	const onError = (e: { message: string }) => toast.error(e.message);
	const create = useMutation(trpc.courses.create.mutationOptions({ onError }));
	const update = useMutation(trpc.courses.update.mutationOptions({ onError }));

	const set = <K extends keyof CourseInput>(key: K, value: CourseInput[K]) =>
		setValues((v) => ({
			...v,
			[key]: value,
			...(key === "name" && !slugTouched
				? { slug: slugify(String(value)) }
				: {}),
		}));

	function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		const parsed = courseInput.safeParse(values);
		if (!parsed.success) {
			const next: typeof errors = {};
			for (const i of parsed.error.issues)
				next[i.path[0] as keyof CourseInput] ??= i.message;
			setErrors(next);
			return;
		}
		setErrors({});
		const done = () => {
			toast.success(course ? "Kurssi tallennettu" : "Kurssi lisätty");
			onDone();
		};
		if (course)
			update.mutate({ id: course.id, ...parsed.data }, { onSuccess: done });
		else create.mutate(parsed.data, { onSuccess: done });
	}

	const text = (
		key: keyof CourseInput,
		label: string,
		props: React.ComponentProps<"input"> = {},
	) => (
		<div className="grid gap-1.5">
			<Label htmlFor={key}>{label}</Label>
			<Input
				id={key}
				value={String(values[key])}
				onChange={(e) => set(key, e.target.value as never)}
				aria-invalid={!!errors[key]}
				{...props}
			/>
			{errors[key] && <p className="text-destructive text-xs">{errors[key]}</p>}
		</div>
	);
	const num = (key: "sessions" | "maxParticipants", label: string) => (
		<div className="grid gap-1.5">
			<Label htmlFor={key}>{label}</Label>
			<Input
				id={key}
				type="number"
				min={1}
				value={values[key]}
				onChange={(e) => set(key, e.target.valueAsNumber)}
				aria-invalid={!!errors[key]}
			/>
			{errors[key] && <p className="text-destructive text-xs">{errors[key]}</p>}
		</div>
	);

	return (
		<form
			onSubmit={onSubmit}
			className="mt-6 rounded-xl border border-border bg-card p-6"
		>
			<h2 className="font-semibold text-lg">
				{course ? `Muokkaa: ${course.name}` : "Uusi kurssi"}
			</h2>
			<div className="mt-5 grid gap-5 md:grid-cols-2">
				{text("name", "Nimi")}
				<div className="grid gap-1.5">
					<Label htmlFor="slug">Osoitetunniste</Label>
					<Input
						id="slug"
						value={values.slug}
						onChange={(e) => {
							setSlugTouched(true);
							set("slug", e.target.value);
						}}
						aria-invalid={!!errors.slug}
					/>
					<p className="text-muted-foreground text-xs">
						{errors.slug ? (
							<span className="text-destructive">{errors.slug}</span>
						) : (
							`/kurssit/varaa?kurssi=${values.slug}`
						)}
					</p>
				</div>
				<div className="grid gap-1.5 md:col-span-2">
					<Label htmlFor="description">Kuvaus</Label>
					<Textarea
						id="description"
						rows={4}
						value={values.description}
						onChange={(e) => set("description", e.target.value)}
						aria-invalid={!!errors.description}
					/>
					{errors.description && (
						<p className="text-destructive text-xs">{errors.description}</p>
					)}
				</div>
				{text("targetGroup", "Kenelle")}
				{text("startsOn", "Alkamispäivä", { type: "date" })}
				{text("schedule", "Aika", { placeholder: "ti klo 18.00–19.00" })}
				{text("platform", "Alusta", { placeholder: "Zoom" })}
				{num("sessions", "Kertoja")}
				{num("maxParticipants", "Maksimi osallistujat")}
				<div className="grid gap-1.5">
					<Label htmlFor="price">Hinta (€)</Label>
					<Input
						id="price"
						type="number"
						min={0}
						step="0.01"
						value={values.priceCents / 100}
						onChange={(e) =>
							set("priceCents", Math.round(e.target.valueAsNumber * 100) || 0)
						}
						aria-invalid={!!errors.priceCents}
					/>
				</div>
				<label className="flex items-center gap-2 self-end pb-2 text-sm">
					<input
						type="checkbox"
						checked={values.published}
						onChange={(e) => set("published", e.target.checked)}
						className="size-4 accent-[var(--primary)]"
					/>
					Näkyvissä sivustolla
				</label>
				<fieldset className="md:col-span-2">
					<legend className="font-medium text-sm">Kuva</legend>
					<div className="mt-2 grid grid-cols-7 gap-2">
						{courseImages.map((file) => (
							<label key={file} className="cursor-pointer">
								<input
									type="radio"
									name="image"
									value={file}
									checked={values.image === file}
									onChange={() => set("image", file)}
									className="peer sr-only"
								/>
								<img
									src={img(file)}
									alt={`Kuva ${file}`}
									loading="lazy"
									className="aspect-square w-full rounded-md object-cover opacity-70 ring-primary ring-offset-2 peer-checked:opacity-100 peer-checked:ring-2 peer-focus-visible:ring-2"
								/>
							</label>
						))}
					</div>
				</fieldset>
			</div>
			<div className="mt-6 flex gap-2">
				<Button type="submit" disabled={create.isPending || update.isPending}>
					Tallenna
				</Button>
				<Button type="button" variant="outline" onClick={onDone}>
					Peruuta
				</Button>
			</div>
		</form>
	);
}
