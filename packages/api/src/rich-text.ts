import type { RichTextDoc } from "@koirankoulutus/db/schema/cms";
import z from "zod";

export type { RichTextDoc };

// Server-side check for Tiptap documents. The editor (apps/web/src/components/admin/rich-text-editor.tsx)
// only produces these nodes and marks, and the site renders only these (apps/web/src/lib/rich-text.tsx); anything else is dropped here, and bad links/images are rejected so a
// crafted request can't store e.g. a `javascript:` link that the public site would render.

type Node = {
	type: string;
	attrs?: Record<string, unknown>;
	content?: Node[];
	marks?: { type: string; attrs?: Record<string, unknown> }[];
	text?: string;
};

const MAX_DEPTH = 12;
const MAX_JSON_LENGTH = 200_000;

export const MEDIA_SRC = /^\/media\/(seed\/)?[a-z0-9-]+\.(webp|jpg|png)$/i;

// http(s), mailto, tel, or a path on this site ("/kurssit"; not "//evil.com").
export const isSafeHref = (href: string) =>
	/^(https?:\/\/|mailto:|tel:)/i.test(href) || /^\/(?!\/)/.test(href);

const blockTypes = new Set([
	"paragraph",
	"heading",
	"bulletList",
	"orderedList",
	"listItem",
	"blockquote",
	"hardBreak",
	"image",
	"text",
]);

export class RichTextError extends Error {}

function cleanNode(node: unknown, depth: number): Node | null {
	if (depth > MAX_DEPTH)
		throw new RichTextError("Teksti on liian monitasoinen.");
	if (!node || typeof node !== "object") return null;
	const n = node as Node;
	if (!blockTypes.has(n.type)) return null;

	if (n.type === "text") {
		if (typeof n.text !== "string" || n.text === "") return null;
		const marks = (n.marks ?? []).flatMap((m) => {
			if (m.type === "bold" || m.type === "italic") return [{ type: m.type }];
			if (m.type === "link") {
				const href = String(m.attrs?.href ?? "").trim();
				if (!isSafeHref(href))
					throw new RichTextError(
						`Linkki "${href.slice(0, 60)}" ei kelpaa. Käytä osoitetta, joka alkaa https://`,
					);
				return [{ type: "link", attrs: { href } }];
			}
			return [];
		});
		return { type: "text", text: n.text, ...(marks.length ? { marks } : {}) };
	}

	if (n.type === "image") {
		const src = String(n.attrs?.src ?? "");
		if (!MEDIA_SRC.test(src))
			throw new RichTextError("Kuvan pitää olla kuvapankista.");
		return {
			type: "image",
			attrs: { src, alt: String(n.attrs?.alt ?? "").slice(0, 300) },
		};
	}

	const out: Node = { type: n.type };
	if (n.type === "heading") {
		out.attrs = { level: n.attrs?.level === 3 ? 3 : 2 };
	}
	if (n.type === "orderedList") {
		const start = Number(n.attrs?.start);
		out.attrs = { start: Number.isInteger(start) && start > 0 ? start : 1 };
	}
	if (Array.isArray(n.content)) {
		const content = n.content
			.map((c) => cleanNode(c, depth + 1))
			.filter((c): c is Node => c !== null);
		if (content.length) out.content = content;
	}
	return out;
}

export function cleanDoc(input: unknown): RichTextDoc {
	if (JSON.stringify(input ?? null).length > MAX_JSON_LENGTH)
		throw new RichTextError("Teksti on liian pitkä.");
	const doc = input as { type?: string; content?: unknown };
	if (doc?.type !== "doc" || !Array.isArray(doc.content))
		throw new RichTextError("Tekstin muoto on virheellinen.");
	const content = doc.content
		.map((c) => cleanNode(c, 1))
		.filter((c): c is Node => c !== null);
	return { type: "doc", content };
}

export const richTextDoc = z.unknown().transform((value, ctx) => {
	try {
		return cleanDoc(value);
	} catch (e) {
		ctx.addIssue({
			code: "custom",
			message: e instanceof RichTextError ? e.message : "Virheellinen teksti",
		});
		return z.NEVER;
	}
});

export const emptyDoc = (): RichTextDoc => ({ type: "doc", content: [] });

// Plain text of a doc, e.g. for a meta description fallback.
export function docText(doc: RichTextDoc, max = 160): string {
	const parts: string[] = [];
	const walk = (n: Node) => {
		if (n.text) parts.push(n.text);
		n.content?.forEach(walk);
		if (n.type === "paragraph" || n.type === "heading") parts.push(" ");
	};
	(doc.content as Node[] | undefined)?.forEach(walk);
	const text = parts.join("").replace(/\s+/g, " ").trim();
	return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
