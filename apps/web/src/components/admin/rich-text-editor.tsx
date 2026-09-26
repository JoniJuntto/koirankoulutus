import { mediaUrl } from "@koirankoulutus/api/format";
import type { RichTextDoc } from "@koirankoulutus/api/rich-text";
import { Button } from "@koirankoulutus/ui/components/button";
import { Input } from "@koirankoulutus/ui/components/input";
import { Label } from "@koirankoulutus/ui/components/label";
import { cn } from "@koirankoulutus/ui/lib/utils";
import Image from "@tiptap/extension-image";
import {
	type Editor,
	EditorContent,
	type JSONContent,
	useEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
	Bold,
	Heading2,
	Heading3,
	ImagePlus,
	Italic,
	Link2,
	List,
	ListOrdered,
	Pilcrow,
	Quote,
	Redo2,
	Undo2,
} from "lucide-react";
import { useState } from "react";

import { MediaPicker } from "./media";
import { Modal } from "./modal";

// What the editor can produce. The server (packages/api/src/rich-text.ts) accepts the same nodes and
// apps/web/src/lib/rich-text.tsx renders them; keep all three in sync when adding a button.
const richTextExtensions = [
	StarterKit.configure({
		heading: { levels: [2, 3] },
		code: false,
		codeBlock: false,
		horizontalRule: false,
		strike: false,
		underline: false,
		link: {
			openOnClick: false,
			autolink: true,
			defaultProtocol: "https",
			protocols: ["mailto", "tel"],
		},
	}),
	Image.configure({ allowBase64: false }),
];

// "facebook.com/x" -> "https://facebook.com/x", "teija@x.fi" -> "mailto:teija@x.fi".
// Must end up as something packages/api/src/rich-text.ts accepts.
export function normalizeHref(raw: string) {
	const v = raw.trim();
	if (!v) return "";
	if (/^(https?:\/\/|mailto:|tel:)/i.test(v) || /^\/(?!\/)/.test(v)) return v;
	if (/^[^\s@/]+@[^\s@/]+\.[a-z]{2,}$/i.test(v)) return `mailto:${v}`;
	if (/^\+?[\d\s()-]{5,}$/.test(v)) return `tel:${v.replace(/[^\d+]/g, "")}`;
	return `https://${v.replace(/^\/+/, "")}`;
}

function ToolButton({
	label,
	icon: Icon,
	active,
	onClick,
	disabled,
}: {
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	active?: boolean;
	onClick: () => void;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			onMouseDown={(e) => e.preventDefault()}
			onClick={onClick}
			disabled={disabled}
			aria-pressed={active}
			title={label}
			className={cn(
				"inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-sm hover:bg-secondary disabled:opacity-40",
				active && "bg-secondary text-primary",
			)}
		>
			<Icon className="size-4" />
			<span>{label}</span>
		</button>
	);
}

function LinkDialog({
	editor,
	open,
	onClose,
}: {
	editor: Editor;
	open: boolean;
	onClose: () => void;
}) {
	const existing = editor.getAttributes("link").href as string | undefined;
	const hasSelection = !editor.state.selection.empty;
	const [href, setHref] = useState("");
	const [text, setText] = useState("");

	const apply = () => {
		const url = normalizeHref(href || existing || "");
		if (!url) return onClose();
		const chain = editor.chain().focus();
		if (!hasSelection && !existing) {
			chain
				.insertContent({
					type: "text",
					text: text.trim() || url.replace(/^(https?:\/\/|mailto:|tel:)/, ""),
					marks: [{ type: "link", attrs: { href: url } }],
				})
				.run();
		} else {
			chain.extendMarkRange("link").setLink({ href: url }).run();
		}
		setHref("");
		setText("");
		onClose();
	};

	const submitOnEnter = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			apply();
		}
	};

	return (
		<Modal
			open={open}
			onClose={onClose}
			title={existing ? "Muokkaa linkkiä" : "Lisää linkki"}
			footer={
				<>
					{existing && (
						<Button
							type="button"
							variant="outline"
							className="mr-auto text-destructive"
							onClick={() => {
								editor
									.chain()
									.focus()
									.extendMarkRange("link")
									.unsetLink()
									.run();
								onClose();
							}}
						>
							Poista linkki
						</Button>
					)}
					<Button type="button" variant="outline" onClick={onClose}>
						Peruuta
					</Button>
					<Button type="button" onClick={apply}>
						Tallenna linkki
					</Button>
				</>
			}
		>
			<div className="grid gap-4">
				<div className="grid gap-1.5">
					<Label htmlFor="link-href">Osoite</Label>
					<Input
						id="link-href"
						autoFocus
						defaultValue={existing}
						onChange={(e) => setHref(e.target.value)}
						onKeyDown={submitOnEnter}
						placeholder="esim. www.facebook.com/… tai sähköpostiosoite"
					/>
				</div>
				{!hasSelection && !existing && (
					<div className="grid gap-1.5">
						<Label htmlFor="link-text">Linkin teksti</Label>
						<Input
							id="link-text"
							onChange={(e) => setText(e.target.value)}
							onKeyDown={submitOnEnter}
							placeholder="esim. Seuraa Facebookissa"
						/>
					</div>
				)}
			</div>
		</Modal>
	);
}

export function RichTextEditor({
	value,
	onChange,
	label,
}: {
	value: RichTextDoc;
	onChange: (doc: RichTextDoc) => void;
	label: string;
}) {
	const [linkOpen, setLinkOpen] = useState(false);
	const [imageOpen, setImageOpen] = useState(false);
	const editor = useEditor({
		extensions: richTextExtensions,
		content: value as JSONContent,
		shouldRerenderOnTransaction: true,
		onUpdate: ({ editor }) => onChange(editor.getJSON() as RichTextDoc),
		editorProps: {
			attributes: {
				class: "prose min-h-72 px-5 py-4 focus:outline-none",
				"aria-label": label,
			},
			// Pasted images (from Facebook, Word…) aren't in the media library; add them with "Lisää kuva".
			transformPastedHTML: (html) => html.replace(/<img[^>]*>/gi, ""),
		},
	});
	if (!editor) return null;

	const is = (name: string, attrs?: Record<string, unknown>) =>
		editor.isActive(name, attrs);
	const chain = () => editor.chain().focus();

	return (
		<div className="rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring/40">
			<div
				role="toolbar"
				aria-label="Muotoilu"
				className="sticky top-0 z-10 flex flex-wrap gap-0.5 rounded-t-xl border-border border-b bg-card p-1.5"
			>
				<ToolButton
					label="Teksti"
					icon={Pilcrow}
					active={is("paragraph")}
					onClick={() => chain().setParagraph().run()}
				/>
				<ToolButton
					label="Otsikko"
					icon={Heading2}
					active={is("heading", { level: 2 })}
					onClick={() => chain().toggleHeading({ level: 2 }).run()}
				/>
				<ToolButton
					label="Väliotsikko"
					icon={Heading3}
					active={is("heading", { level: 3 })}
					onClick={() => chain().toggleHeading({ level: 3 }).run()}
				/>
				<span className="mx-1 w-px self-stretch bg-border" aria-hidden />
				<ToolButton
					label="Lihavointi"
					icon={Bold}
					active={is("bold")}
					onClick={() => chain().toggleBold().run()}
				/>
				<ToolButton
					label="Kursiivi"
					icon={Italic}
					active={is("italic")}
					onClick={() => chain().toggleItalic().run()}
				/>
				<ToolButton
					label="Linkki"
					icon={Link2}
					active={is("link")}
					onClick={() => setLinkOpen(true)}
				/>
				<span className="mx-1 w-px self-stretch bg-border" aria-hidden />
				<ToolButton
					label="Luettelo"
					icon={List}
					active={is("bulletList")}
					onClick={() => chain().toggleBulletList().run()}
				/>
				<ToolButton
					label="Numeroitu"
					icon={ListOrdered}
					active={is("orderedList")}
					onClick={() => chain().toggleOrderedList().run()}
				/>
				<ToolButton
					label="Lainaus"
					icon={Quote}
					active={is("blockquote")}
					onClick={() => chain().toggleBlockquote().run()}
				/>
				<ToolButton
					label="Lisää kuva"
					icon={ImagePlus}
					onClick={() => setImageOpen(true)}
				/>
				<span className="mx-1 w-px self-stretch bg-border" aria-hidden />
				<ToolButton
					label="Kumoa"
					icon={Undo2}
					disabled={!editor.can().undo()}
					onClick={() => chain().undo().run()}
				/>
				<ToolButton
					label="Tee uudelleen"
					icon={Redo2}
					disabled={!editor.can().redo()}
					onClick={() => chain().redo().run()}
				/>
			</div>
			<EditorContent editor={editor} />
			<LinkDialog
				key={String(linkOpen)}
				editor={editor}
				open={linkOpen}
				onClose={() => setLinkOpen(false)}
			/>
			<MediaPicker
				open={imageOpen}
				onClose={() => setImageOpen(false)}
				onPick={([m]) => {
					if (m)
						chain()
							.setImage({ src: mediaUrl(m.key), alt: m.alt })
							.run();
				}}
			/>
		</div>
	);
}
