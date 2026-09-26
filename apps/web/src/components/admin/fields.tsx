import { Input } from "@koirankoulutus/ui/components/input";
import { Label } from "@koirankoulutus/ui/components/label";
import { Textarea } from "@koirankoulutus/ui/components/textarea";
import { useId } from "react";

import type { z } from "zod";

export function TextField({
	label,
	hint,
	error,
	value,
	onChange,
	multiline,
	rows = 3,
	...props
}: {
	label: string;
	hint?: React.ReactNode;
	error?: string;
	value: string;
	onChange: (v: string) => void;
	multiline?: boolean;
	rows?: number;
} & Omit<React.ComponentProps<"input">, "value" | "onChange">) {
	const id = useId();
	const common = {
		id,
		value,
		"aria-invalid": !!error,
		"aria-describedby": hint || error ? `${id}-hint` : undefined,
	};
	return (
		<div className="grid gap-1.5">
			<Label htmlFor={id}>{label}</Label>
			{multiline ? (
				<Textarea
					{...common}
					rows={rows}
					onChange={(e) => onChange(e.target.value)}
				/>
			) : (
				<Input
					{...common}
					{...props}
					onChange={(e) => onChange(e.target.value)}
				/>
			)}
			{(error || hint) && (
				<p
					id={`${id}-hint`}
					className={
						error ? "text-destructive text-xs" : "text-muted-foreground text-xs"
					}
				>
					{error ?? hint}
				</p>
			)}
		</div>
	);
}

export function Toggle({
	label,
	hint,
	checked,
	onChange,
}: {
	label: string;
	hint?: string;
	checked: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<label className="flex items-start gap-3 text-sm">
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
				className="mt-0.5 size-4 accent-[var(--primary)]"
			/>
			<span>
				<span className="font-medium">{label}</span>
				{hint && (
					<span className="block text-muted-foreground text-xs">{hint}</span>
				)}
			</span>
		</label>
	);
}

// Rarely needed options, closed by default so the form stays simple.
export function MoreOptions({ children }: { children: React.ReactNode }) {
	return (
		<details className="rounded-xl border border-border bg-card p-4 [&[open]>summary]:mb-4">
			<summary className="cursor-pointer font-medium text-sm">
				Lisäasetukset
			</summary>
			<div className="grid gap-5">{children}</div>
		</details>
	);
}

// First error message per top-level field, for showing next to the inputs.
export function fieldErrors<T>(error: z.ZodError<T>) {
	const out: Record<string, string> = {};
	for (const issue of error.issues) {
		const key = String(issue.path[0] ?? "");
		out[key] ??= issue.message;
	}
	return out;
}
