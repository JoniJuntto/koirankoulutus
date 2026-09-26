import type { Context as ApiContext } from "@koirankoulutus/api/context";
import type { Context as ElysiaContext } from "elysia";

import { ENV } from "./env.server";
import { auth, db, mailer, storage } from "./services";

export type CreateContextOptions = {
	context: ElysiaContext;
};

// Behind a reverse proxy (Caddy) the last X-Forwarded-For entry is the one the proxy added.
// ponytail: without a proxy a client can spoof it and dodge the rate limit; the honeypot still applies.
function clientIp({ request, server }: ElysiaContext) {
	const forwarded = request.headers.get("x-forwarded-for");
	if (forwarded) return forwarded.split(",").at(-1)?.trim() ?? "unknown";
	return server?.requestIP(request)?.address ?? "unknown";
}

export async function createContext({
	context,
}: CreateContextOptions): Promise<ApiContext> {
	const session = await auth.api.getSession({
		headers: context.request.headers,
	});
	return {
		db,
		session,
		ip: clientIp(context),
		mailer,
		storage,
		trainerEmail: ENV.TRAINER_EMAIL,
		siteUrl: ENV.PUBLIC_SITE_URL,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
