import { TRPCError } from "@trpc/server";

export function pgCode(e: unknown): string | undefined {
	const err = e as { code?: string; cause?: { code?: string } };
	return err.code ?? err.cause?.code;
}

export function uniqueSlugError(e: unknown) {
	return pgCode(e) === "23505"
		? new TRPCError({
				code: "CONFLICT",
				message: "Osoite on jo käytössä. Valitse toinen.",
			})
		: e;
}

export const notFound = (message: string) =>
	new TRPCError({ code: "NOT_FOUND", message });
