import { mediaUrl } from "@koirankoulutus/api/format";
import type { AppRouter } from "@koirankoulutus/api/routers/index";
import { Button } from "@koirankoulutus/ui/components/button";
import { cn } from "@koirankoulutus/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import {
	ArrowLeft,
	ArrowRight,
	Check,
	ImagePlus,
	Loader2,
	Trash2,
	Upload,
	X,
} from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";

import { type UploadedMedia, uploadImage } from "@/lib/upload";
import { trpc } from "@/utils/trpc";

import { Modal } from "./modal";

export type Media = inferRouterOutputs<AppRouter>["media"]["list"][number];

export function useMediaList() {
	return useQuery(trpc.media.list.queryOptions());
}

function useMediaById() {
	const list = useMediaList();
	return new Map((list.data ?? []).map((m) => [m.id, m]));
}

// Drop zone + "Valitse kuvat" button. Several files at once; each is shrunk and uploaded in turn.
export function Uploader({
	onUploaded,
	compact = false,
}: {
	onUploaded?: (m: UploadedMedia) => void;
	compact?: boolean;
}) {
	const queryClient = useQueryClient();
	const input = useRef<HTMLInputElement>(null);
	const [pending, setPending] = useState(0);
	const [over, setOver] = useState(false);

	async function upload(files: File[]) {
		const images = files.filter((f) => f.type.startsWith("image/"));
		if (images.length < files.length)
			toast.error("Vain kuvatiedostoja voi lisätä.");
		setPending((n) => n + images.length);
		for (const file of images) {
			try {
				const m = await uploadImage(file);
				onUploaded?.(m);
			} catch (e) {
				toast.error((e as Error).message);
			} finally {
				setPending((n) => n - 1);
			}
		}
		await queryClient.invalidateQueries({
			queryKey: trpc.media.list.queryKey(),
		});
		if (images.length)
			toast.success(images.length === 1 ? "Kuva lisätty" : "Kuvat lisätty");
	}

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: dropping files is a mouse shortcut; the button inside works with the keyboard
		<div
			onDragOver={(e) => {
				e.preventDefault();
				setOver(true);
			}}
			onDragLeave={() => setOver(false)}
			onDrop={(e) => {
				e.preventDefault();
				setOver(false);
				upload([...e.dataTransfer.files]);
			}}
			className={cn(
				"flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-border border-dashed text-center",
				compact ? "p-4" : "p-8",
				over && "border-primary bg-secondary/50",
			)}
		>
			<input
				ref={input}
				type="file"
				accept="image/*"
				multiple
				hidden
				onChange={(e) => {
					upload([...(e.target.files ?? [])]);
					e.target.value = "";
				}}
			/>
			<Button
				type="button"
				onClick={() => input.current?.click()}
				disabled={pending > 0}
			>
				{pending > 0 ? <Loader2 className="animate-spin" /> : <Upload />}
				{pending > 0 ? `Ladataan (${pending})…` : "Valitse kuvat koneelta"}
			</Button>
			{!compact && (
				<p className="text-muted-foreground text-sm">
					tai vedä kuvat tähän. Isot kuvat pienennetään automaattisesti.
				</p>
			)}
		</div>
	);
}

// Alt text field that saves when you leave it.
function AltInput({ media }: { media: Media }) {
	const queryClient = useQueryClient();
	const [value, setValue] = useState(media.alt);
	const id = useId();
	const save = useMutation(
		trpc.media.updateAlt.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: trpc.media.list.queryKey() });
				toast.success("Kuvaus tallennettu");
			},
			onError: (e) => toast.error(e.message),
		}),
	);
	return (
		<div>
			<label htmlFor={id} className="text-muted-foreground text-xs">
				Mitä kuvassa on?
			</label>
			<input
				id={id}
				value={value}
				placeholder="Esim. koira hyppää esteen yli"
				onChange={(e) => setValue(e.target.value)}
				onBlur={() => {
					if (value.trim() !== media.alt)
						save.mutate({ id: media.id, alt: value });
				}}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						e.currentTarget.blur();
					}
				}}
				className={cn(
					"mt-0.5 w-full rounded-md border bg-background px-2 py-1 text-sm",
					value.trim() ? "border-input" : "border-amber-400",
				)}
			/>
		</div>
	);
}

export function MediaGrid({
	selected,
	onToggle,
}: {
	// Select mode (picker) when given; otherwise manage mode with alt text and delete.
	selected?: string[];
	onToggle?: (m: Media) => void;
}) {
	const list = useMediaList();
	const queryClient = useQueryClient();
	const remove = useMutation(
		trpc.media.remove.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: trpc.media.list.queryKey() });
				toast.success("Kuva poistettu");
			},
			onError: (e) => toast.error(e.message, { duration: 8000 }),
		}),
	);

	if (list.isPending)
		return <p className="text-muted-foreground text-sm">Ladataan kuvia…</p>;
	if (!list.data?.length)
		return (
			<p className="text-muted-foreground text-sm">
				Ei vielä kuvia. Lisää ensimmäinen yllä.
			</p>
		);

	return (
		<ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
			{list.data.map((m) => {
				const isSelected = selected?.includes(m.id);
				return (
					<li
						key={m.id}
						className="overflow-hidden rounded-xl border border-border bg-card"
					>
						{onToggle ? (
							<button
								type="button"
								onClick={() => onToggle(m)}
								aria-pressed={isSelected}
								aria-label={m.alt || "Kuva ilman kuvausta"}
								className="relative block w-full focus-visible:outline-3 focus-visible:outline-ring"
							>
								<img
									src={mediaUrl(m.key)}
									alt=""
									loading="lazy"
									className={cn(
										"aspect-square w-full object-cover",
										isSelected && "opacity-80",
									)}
								/>
								{isSelected && (
									<span className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
										<Check className="size-5" />
									</span>
								)}
								<span className="block truncate px-2 py-1.5 text-left text-xs">
									{m.alt || "Ei kuvausta"}
								</span>
							</button>
						) : (
							<>
								<img
									src={mediaUrl(m.key)}
									alt={m.alt}
									loading="lazy"
									className="aspect-square w-full object-cover"
								/>
								<div className="grid gap-2 p-3">
									<AltInput media={m} />
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="justify-self-start text-destructive"
										onClick={() => {
											if (window.confirm("Poistetaanko kuva pysyvästi?"))
												remove.mutate({ id: m.id });
										}}
									>
										<Trash2 /> Poista
									</Button>
								</div>
							</>
						)}
					</li>
				);
			})}
		</ul>
	);
}

export function MediaPicker({
	open,
	onClose,
	onPick,
	multiple = false,
	title = "Valitse kuva",
}: {
	open: boolean;
	onClose: () => void;
	onPick: (media: Pick<Media, "id" | "key" | "alt">[]) => void;
	multiple?: boolean;
	title?: string;
}) {
	const [selected, setSelected] = useState<Pick<Media, "id" | "key" | "alt">[]>(
		[],
	);
	const close = () => {
		setSelected([]);
		onClose();
	};
	const pick = (items: Pick<Media, "id" | "key" | "alt">[]) => {
		onPick(items);
		close();
	};
	return (
		<Modal
			open={open}
			onClose={close}
			title={title}
			className="max-w-4xl"
			footer={
				multiple && (
					<>
						<Button type="button" variant="outline" onClick={close}>
							Peruuta
						</Button>
						<Button
							type="button"
							disabled={!selected.length}
							onClick={() => pick(selected)}
						>
							Lisää valitut ({selected.length})
						</Button>
					</>
				)
			}
		>
			<Uploader
				compact
				onUploaded={(m) =>
					multiple ? setSelected((s) => [...s, m]) : pick([m])
				}
			/>
			<p className="mt-5 mb-3 font-medium text-sm">
				{multiple
					? "Tai valitse kuvapankista (voit valita useita):"
					: "Tai valitse kuvapankista:"}
			</p>
			<MediaGrid
				selected={selected.map((s) => s.id)}
				onToggle={(m) =>
					multiple
						? setSelected((s) =>
								s.some((x) => x.id === m.id)
									? s.filter((x) => x.id !== m.id)
									: [...s, m],
							)
						: pick([m])
				}
			/>
		</Modal>
	);
}

// One image (course photo, cover, dog photo). `optional` adds a remove button.
export function ImageField({
	label,
	value,
	onChange,
	optional = false,
	error,
}: {
	label: string;
	value: string | null;
	onChange: (id: string | null) => void;
	optional?: boolean;
	error?: string;
}) {
	const byId = useMediaById();
	const [open, setOpen] = useState(false);
	const current = value ? byId.get(value) : undefined;
	return (
		<div className="grid gap-1.5">
			<span className="font-medium text-sm">{label}</span>
			<div className="flex flex-wrap items-center gap-4">
				{current ? (
					<img
						src={mediaUrl(current.key)}
						alt={current.alt}
						className="size-28 rounded-lg object-cover"
					/>
				) : (
					<div className="flex size-28 items-center justify-center rounded-lg border-2 border-border border-dashed text-muted-foreground">
						<ImagePlus />
					</div>
				)}
				<div className="flex flex-col gap-2">
					<Button type="button" variant="outline" onClick={() => setOpen(true)}>
						<ImagePlus /> {current ? "Vaihda kuva" : "Valitse kuva"}
					</Button>
					{optional && current && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => onChange(null)}
						>
							<X /> Poista kuva
						</Button>
					)}
				</div>
			</div>
			{error && <p className="text-destructive text-xs">{error}</p>}
			<MediaPicker
				open={open}
				onClose={() => setOpen(false)}
				onPick={([m]) => m && onChange(m.id)}
			/>
		</div>
	);
}

// Ordered list of images (page gallery).
export function GalleryField({
	value,
	onChange,
}: {
	value: string[];
	onChange: (ids: string[]) => void;
}) {
	const byId = useMediaById();
	const [open, setOpen] = useState(false);
	const move = (i: number, by: number) => {
		const next = [...value];
		const [item] = next.splice(i, 1);
		if (item) next.splice(i + by, 0, item);
		onChange(next);
	};
	return (
		<div className="grid gap-2">
			<span className="font-medium text-sm">Kuvagalleria sivun lopussa</span>
			{value.length > 0 && (
				<ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
					{value.map((id, i) => {
						const m = byId.get(id);
						return (
							<li
								key={id}
								className="overflow-hidden rounded-lg border border-border bg-card"
							>
								{m && (
									<img
										src={mediaUrl(m.key)}
										alt={m.alt}
										className="aspect-square w-full object-cover"
									/>
								)}
								<div className="flex justify-between p-1">
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										aria-label="Siirrä vasemmalle"
										disabled={i === 0}
										onClick={() => move(i, -1)}
									>
										<ArrowLeft />
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										aria-label="Poista galleriasta"
										onClick={() => onChange(value.filter((x) => x !== id))}
									>
										<X />
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										aria-label="Siirrä oikealle"
										disabled={i === value.length - 1}
										onClick={() => move(i, 1)}
									>
										<ArrowRight />
									</Button>
								</div>
							</li>
						);
					})}
				</ul>
			)}
			<Button
				type="button"
				variant="outline"
				className="justify-self-start"
				onClick={() => setOpen(true)}
			>
				<ImagePlus /> Lisää kuvia galleriaan
			</Button>
			<MediaPicker
				open={open}
				multiple
				title="Lisää kuvia galleriaan"
				onClose={() => setOpen(false)}
				onPick={(items) =>
					onChange([
						...value,
						...items.map((m) => m.id).filter((id) => !value.includes(id)),
					])
				}
			/>
		</div>
	);
}
