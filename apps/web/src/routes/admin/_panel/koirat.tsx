import { mediaUrl } from "@koirankoulutus/api/format";
import type { AppRouter } from "@koirankoulutus/api/routers/index";
import { type DogInput, dogInput } from "@koirankoulutus/api/schemas";
import { Button } from "@koirankoulutus/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { fieldErrors, TextField } from "@/components/admin/fields";
import { ImageField } from "@/components/admin/media";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/admin/_panel/koirat")({
	component: DogsAdminPage,
});

type Dog = inferRouterOutputs<AppRouter>["dogs"]["list"][number]["dog"];

const blank: DogInput = {
	name: "",
	breed: "Australianpaimenkoira",
	age: "",
	titles: "",
	note: "",
	imageId: null,
};

function DogsAdminPage() {
	const dogs = useQuery(trpc.dogs.list.queryOptions());
	const queryClient = useQueryClient();
	const [editing, setEditing] = useState<Dog | "new" | null>(null);
	const refresh = () =>
		queryClient.invalidateQueries({ queryKey: trpc.dogs.list.queryKey() });
	const onError = (e: { message: string }) => toast.error(e.message);
	const reorder = useMutation(
		trpc.dogs.reorder.mutationOptions({ onSuccess: refresh, onError }),
	);
	const remove = useMutation(
		trpc.dogs.remove.mutationOptions({
			onSuccess: () => {
				refresh();
				toast.success("Koira poistettu");
			},
			onError,
		}),
	);
	const list = dogs.data ?? [];
	const move = (i: number, by: number) => {
		const ids = list.map((d) => d.dog.id);
		const [id] = ids.splice(i, 1);
		if (id !== undefined) ids.splice(i + by, 0, id);
		reorder.mutate({ ids });
	};

	return (
		<div className="mx-auto max-w-4xl">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="font-semibold text-2xl">Koirat</h1>
					<p className="text-muted-foreground text-sm">
						Näkyvät Kouluttaja-sivulla kohdassa "Kotona asuvat koirat" tässä
						järjestyksessä.
					</p>
				</div>
				{!editing && (
					<Button onClick={() => setEditing("new")}>
						<Plus /> Lisää koira
					</Button>
				)}
			</div>

			{editing && (
				<DogForm
					key={editing === "new" ? "new" : editing.id}
					dog={editing === "new" ? null : editing}
					onDone={() => {
						setEditing(null);
						refresh();
					}}
				/>
			)}

			<ul className="mt-6 grid gap-3">
				{list.map(({ dog, imageKey }, i) => (
					<li
						key={dog.id}
						className="flex items-center gap-4 rounded-xl border border-border bg-card p-3"
					>
						{imageKey ? (
							<img
								src={mediaUrl(imageKey)}
								alt=""
								className="size-16 rounded-lg object-cover"
							/>
						) : (
							<div className="size-16 rounded-lg bg-muted" />
						)}
						<div className="min-w-0 flex-1">
							<p className="truncate font-medium">{dog.name}</p>
							<p className="truncate text-muted-foreground text-sm">
								{[dog.breed, dog.age, dog.titles].filter(Boolean).join(" · ")}
							</p>
						</div>
						<div className="flex gap-1">
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label={`Siirrä ${dog.name} ylemmäs`}
								disabled={i === 0 || reorder.isPending}
								onClick={() => move(i, -1)}
							>
								<ArrowUp />
							</Button>
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label={`Siirrä ${dog.name} alemmas`}
								disabled={i === list.length - 1 || reorder.isPending}
								onClick={() => move(i, 1)}
							>
								<ArrowDown />
							</Button>
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label={`Muokkaa ${dog.name}`}
								onClick={() => setEditing(dog)}
							>
								<Pencil />
							</Button>
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label={`Poista ${dog.name}`}
								onClick={() => {
									if (window.confirm(`Poistetaanko ${dog.name} sivulta?`))
										remove.mutate({ id: dog.id });
								}}
							>
								<Trash2 />
							</Button>
						</div>
					</li>
				))}
			</ul>
			{dogs.data?.length === 0 && (
				<p className="mt-6 text-muted-foreground">
					Ei koiria. Osio piilotetaan sivulta.
				</p>
			)}
		</div>
	);
}

function DogForm({ dog, onDone }: { dog: Dog | null; onDone: () => void }) {
	const initial: DogInput = dog
		? {
				name: dog.name,
				breed: dog.breed,
				age: dog.age,
				titles: dog.titles,
				note: dog.note,
				imageId: dog.imageId,
			}
		: blank;
	const [values, setValues] = useState(initial);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const allowLeave = useUnsavedChanges(
		JSON.stringify(values) !== JSON.stringify(initial),
	);
	const onError = (e: { message: string }) => toast.error(e.message);
	const create = useMutation(trpc.dogs.create.mutationOptions({ onError }));
	const update = useMutation(trpc.dogs.update.mutationOptions({ onError }));
	const set = (key: keyof DogInput) => (v: string | null) =>
		setValues((s) => ({ ...s, [key]: v }));

	return (
		<form
			className="mt-6 grid gap-5 rounded-xl border border-border bg-card p-6 md:grid-cols-2"
			onSubmit={(e) => {
				e.preventDefault();
				const parsed = dogInput.safeParse(values);
				if (!parsed.success) return setErrors(fieldErrors(parsed.error));
				const done = () => {
					allowLeave();
					toast.success(dog ? "Tallennettu" : "Koira lisätty");
					onDone();
				};
				if (dog)
					update.mutate({ id: dog.id, ...parsed.data }, { onSuccess: done });
				else create.mutate(parsed.data, { onSuccess: done });
			}}
		>
			<h2 className="font-semibold text-lg md:col-span-2">
				{dog ? `Muokkaa: ${dog.name}` : "Uusi koira"}
			</h2>
			<TextField
				label="Nimi"
				value={values.name}
				onChange={set("name")}
				error={errors.name}
			/>
			<TextField
				label="Rotu"
				value={values.breed ?? ""}
				onChange={set("breed")}
			/>
			<TextField
				label="Ikä"
				hint="Esim. 3 v"
				value={values.age ?? ""}
				onChange={set("age")}
			/>
			<TextField
				label="Tittelit ja tulokset"
				hint="Esim. FI KVA-PKH HK3 JK3"
				value={values.titles ?? ""}
				onChange={set("titles")}
			/>
			<div className="md:col-span-2">
				<TextField
					label="Lisätietoa"
					multiline
					value={values.note ?? ""}
					onChange={set("note")}
				/>
			</div>
			<div className="md:col-span-2">
				<ImageField
					label="Kuva"
					optional
					value={values.imageId ?? null}
					onChange={set("imageId")}
				/>
			</div>
			<div className="flex gap-2 md:col-span-2">
				<Button type="submit" disabled={create.isPending || update.isPending}>
					Tallenna
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={() => {
						allowLeave();
						onDone();
					}}
				>
					Peruuta
				</Button>
			</div>
		</form>
	);
}
