import { type SettingsInput, settingsInput } from "@koirankoulutus/api/schemas";
import { Button } from "@koirankoulutus/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { fieldErrors, TextField } from "@/components/admin/fields";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/admin/_panel/asetukset")({
	component: SettingsPage,
});

function SettingsPage() {
	const settings = useQuery(trpc.settings.get.queryOptions());
	if (!settings.data) return <p className="text-muted-foreground">Ladataan…</p>;
	return <SettingsForm initial={settings.data} />;
}

function SettingsForm({ initial }: { initial: SettingsInput }) {
	const queryClient = useQueryClient();
	const [values, setValues] = useState(initial);
	const [saved, setSaved] = useState(initial);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const dirty = JSON.stringify(values) !== JSON.stringify(saved);
	useUnsavedChanges(dirty);
	const update = useMutation(
		trpc.settings.update.mutationOptions({
			onSuccess: (_, sent) => {
				setSaved(sent);
				queryClient.invalidateQueries({
					queryKey: trpc.settings.get.queryKey(),
				});
				toast.success("Asetukset tallennettu");
			},
			onError: (e) => toast.error(e.message),
		}),
	);
	const field = (
		key: keyof SettingsInput,
		label: string,
		hint?: string,
		multiline = false,
	) => (
		<TextField
			label={label}
			hint={hint}
			multiline={multiline}
			rows={2}
			value={values[key]}
			onChange={(v) => setValues((s) => ({ ...s, [key]: v }))}
			error={errors[key]}
		/>
	);

	return (
		<form
			className="mx-auto grid max-w-2xl gap-6"
			onSubmit={(e) => {
				e.preventDefault();
				const parsed = settingsInput.safeParse(values);
				if (!parsed.success) {
					setErrors(fieldErrors(parsed.error));
					return;
				}
				setErrors({});
				update.mutate(parsed.data);
			}}
		>
			<div>
				<h1 className="font-semibold text-2xl">Asetukset</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Yhteystiedot näkyvät Yhteystiedot-sivulla ja jokaisen sivun
					alalaidassa.
				</p>
			</div>
			<fieldset className="grid gap-5 rounded-xl border border-border bg-card p-5">
				<legend className="px-1 font-semibold">Yhteystiedot</legend>
				{field("phone", "Puhelin", "Esim. 040 123 4567")}
				{field("email", "Sähköposti")}
				{field(
					"facebook",
					"Facebook-sivun osoite",
					"Kopioi osoite selaimen osoiteriviltä, kun olet Facebook-sivullasi.",
				)}
				{field("businessId", "Y-tunnus")}
			</fieldset>
			<fieldset className="grid gap-5 rounded-xl border border-border bg-card p-5">
				<legend className="px-1 font-semibold">Sivuston tekstit</legend>
				{field(
					"footerText",
					"Alalaidan esittelyteksti",
					"Lyhyt teksti sivuston alalaidassa logon alla.",
					true,
				)}
				{field(
					"defaultDescription",
					"Sivuston kuvaus hakukoneille",
					"Näkyy Googlessa ja Facebook-jaoissa, kun sivulla ei ole omaa kuvausta.",
					true,
				)}
			</fieldset>
			<div className="flex items-center gap-3">
				<Button type="submit" size="lg" disabled={update.isPending || !dirty}>
					Tallenna
				</Button>
				{dirty && (
					<span className="text-amber-700 text-sm">
						Tallentamattomia muutoksia
					</span>
				)}
			</div>
		</form>
	);
}
