import { Label } from "@koirankoulutus/ui/components/label";

export function Field({
	label,
	name,
	error,
	className,
	children,
}: {
	label: string;
	name: string;
	error?: string;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div className={`grid gap-2 ${className ?? ""}`}>
			<Label htmlFor={name} className="font-medium">
				{label}
			</Label>
			{children}
			{error && <p className="text-destructive text-sm">{error}</p>}
		</div>
	);
}
