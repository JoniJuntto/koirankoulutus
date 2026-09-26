// Plain text from a textarea: a blank line starts a new paragraph.
export function Paragraphs({
	text,
	className,
}: {
	text: string;
	className?: string;
}) {
	const parts = text
		.split(/\n\s*\n/)
		.map((p) => p.trim())
		.filter(Boolean);
	if (!parts.length) return null;
	return (
		<div className={className}>
			{parts.map((p) => (
				<p key={p}>{p}</p>
			))}
		</div>
	);
}
