import { Button } from "@koirankoulutus/ui/components/button";
import { cn } from "@koirankoulutus/ui/lib/utils";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

// Native <dialog>: focus trap, Esc to close and top-layer stacking come from the browser.
// No <form> inside: modals open from within editor forms, and forms can't nest.
export function Modal({
	open,
	onClose,
	title,
	children,
	footer,
	className,
}: {
	open: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
	footer?: React.ReactNode;
	className?: string;
}) {
	const ref = useRef<HTMLDialogElement>(null);
	useEffect(() => {
		const d = ref.current;
		if (!d) return;
		if (open && !d.open) d.showModal();
		if (!open && d.open) d.close();
	}, [open]);

	return (
		<dialog
			ref={ref}
			onClose={onClose}
			aria-label={title}
			className={cn(
				"m-auto max-h-[90svh] w-[calc(100%-2rem)] max-w-lg flex-col rounded-2xl border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/40 open:flex",
				className,
			)}
		>
			<div className="flex items-center justify-between gap-4 border-border border-b px-5 py-3">
				<h2 className="font-semibold text-lg">{title}</h2>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label="Sulje"
					onClick={onClose}
				>
					<X />
				</Button>
			</div>
			{open && (
				<div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
			)}
			{open && footer && (
				<div className="flex flex-wrap justify-end gap-2 border-border border-t px-5 py-3">
					{footer}
				</div>
			)}
		</dialog>
	);
}
