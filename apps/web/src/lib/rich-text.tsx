import { isSafeHref, type RichTextDoc } from "@koirankoulutus/api/rich-text";
import { cn } from "@koirankoulutus/ui/lib/utils";
import type { ReactNode } from "react";

// Renders the Tiptap JSON stored by the CMS. Hand-written instead of @tiptap/static-renderer:
// that pulls ProseMirror (~120 kB gzip) into every public page for these nine node types.
// The node list matches packages/api/src/rich-text.ts, which cleans documents before they're saved.

type Mark = { type: string; attrs?: { href?: string } };
type Node = {
	type: string;
	text?: string;
	marks?: Mark[];
	attrs?: Record<string, unknown>;
	content?: Node[];
};

function renderText(text: string, marks: Mark[] = []) {
	let out: ReactNode = text;
	for (const m of marks) {
		if (m.type === "bold") out = <strong>{out}</strong>;
		if (m.type === "italic") out = <em>{out}</em>;
	}
	const link = marks.find((m) => m.type === "link")?.attrs?.href;
	if (link && isSafeHref(link)) {
		const external = /^https?:\/\//i.test(link);
		out = (
			<a
				href={link}
				{...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
			>
				{out}
			</a>
		);
	}
	return out;
}

function renderNode(n: Node, key: number): ReactNode {
	const children = n.content?.map(renderNode);
	switch (n.type) {
		case "text":
			return <span key={key}>{renderText(n.text ?? "", n.marks)}</span>;
		case "paragraph":
			return <p key={key}>{children}</p>;
		case "heading":
			return n.attrs?.level === 3 ? (
				<h3 key={key}>{children}</h3>
			) : (
				<h2 key={key}>{children}</h2>
			);
		case "bulletList":
			return <ul key={key}>{children}</ul>;
		case "orderedList":
			return (
				<ol key={key} start={Number(n.attrs?.start) || undefined}>
					{children}
				</ol>
			);
		case "listItem":
			return <li key={key}>{children}</li>;
		case "blockquote":
			return <blockquote key={key}>{children}</blockquote>;
		case "hardBreak":
			return <br key={key} />;
		case "image":
			return (
				<img
					key={key}
					src={String(n.attrs?.src ?? "")}
					alt={String(n.attrs?.alt ?? "")}
					loading="lazy"
				/>
			);
		default:
			return null;
	}
}

export function RichText({
	doc,
	className,
}: {
	doc: RichTextDoc;
	className?: string;
}) {
	const nodes = doc.content as Node[] | undefined;
	if (!nodes?.length) return null;
	return <div className={cn("prose", className)}>{nodes.map(renderNode)}</div>;
}
