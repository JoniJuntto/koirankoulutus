import { cors } from "@elysiajs/cors";
import {
	MAX_UPLOAD_BYTES,
	UploadError,
	uploadMedia,
} from "@koirankoulutus/api/media";
import { appRouter } from "@koirankoulutus/api/routers/index";
import { runMigrations } from "@koirankoulutus/db";
import { media } from "@koirankoulutus/db/schema/cms";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { eq } from "drizzle-orm";
import { Elysia } from "elysia";
import { initLogger } from "evlog";
import {
	type BetterAuthInstance,
	createAuthMiddleware,
} from "evlog/better-auth";
import { evlog } from "evlog/elysia";
import { createFsDrain } from "evlog/fs";

import { createContext } from "./context";
import { ENV } from "./env.server";
import {
	ensureAdmin,
	isFreshCms,
	seedContent,
	seedCourses,
	seedMedia,
} from "./seed";
import { auth, db, storage } from "./services";
import { robotsTxt, shareHtml, sitemapXml } from "./site";

initLogger({
	env: { service: "koirankoulutus-server" },
});

// cwd is apps/server both in dev and in the Docker image.
await runMigrations(db, "../../packages/db/src/migrations");
await ensureAdmin(db, ENV.ADMIN_EMAIL, ENV.ADMIN_PASSWORD);
const fresh = await isFreshCms(db);
const seedIds = await seedMedia(db, storage, fresh);
if (fresh) {
	await seedCourses(db, seedIds);
	await seedContent(db, seedIds);
}

const identifyUser = createAuthMiddleware(auth as BetterAuthInstance, {
	exclude: ["/api/auth/**"],
	maskEmail: true,
});

const siteOrigin = new URL(ENV.CORS_ORIGIN).origin;

// Uploads are the biggest bodies (≤5 MB images); cap everything a bit above that.
new Elysia({ serve: { maxRequestBodySize: MAX_UPLOAD_BYTES + 1024 * 1024 } })
	.use(
		evlog({
			drain:
				process.env.NODE_ENV === "production" ? undefined : createFsDrain(),
		}),
	)
	.derive(async ({ request, log }) => {
		await identifyUser(log, request.headers, new URL(request.url).pathname);
		return {};
	})
	.use(
		cors({
			origin: ENV.CORS_ORIGIN,
			methods: ["GET", "POST", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization"],
			credentials: true,
		}),
	)
	.all("/api/auth/*", async (context) => {
		const { request, status } = context;
		if (["POST", "GET"].includes(request.method)) {
			return auth.handler(request);
		}
		return status(405);
	})
	.all("/trpc/*", async (context) => {
		const res = await fetchRequestHandler({
			endpoint: "/trpc",
			router: appRouter,
			req: context.request,
			createContext: () => createContext({ context }),
		});
		return res;
	})
	.post(
		"/api/media",
		async ({ request, status }) => {
			// Session cookies are SameSite=None, and a multipart POST needs no CORS preflight,
			// so check the origin here to stop other sites uploading with Teija's cookie.
			if (request.headers.get("origin") !== siteOrigin)
				return status(403, { error: "Väärä alkuperä" });
			const session = await auth.api.getSession({ headers: request.headers });
			if (!session) return status(401, { error: "Kirjaudu sisään uudelleen." });
			const form = await request.formData().catch(() => null);
			const file = form?.get("file");
			if (!(file instanceof Blob))
				return status(400, { error: "Kuva puuttuu." });
			try {
				return await uploadMedia(
					{ db, storage },
					file,
					String(form?.get("alt") ?? ""),
				);
			} catch (e) {
				if (e instanceof UploadError)
					return status(e.status as 400, { error: e.message });
				throw e;
			}
		},
		{ parse: "none" },
	)
	.get("/media/*", async ({ params, status }) => {
		const [row] = await db
			.select({ key: media.key, mime: media.mime })
			.from(media)
			.where(eq(media.key, params["*"]));
		if (!row) return status(404, "Not found");
		return new Response(storage.get(row.key), {
			headers: {
				"Content-Type": row.mime,
				// Keys are random and never reused, so the file behind a URL never changes.
				"Cache-Control": "public, max-age=31536000, immutable",
				"X-Content-Type-Options": "nosniff",
			},
		});
	})
	.get(
		"/share/*",
		async ({ params }) =>
			new Response(await shareHtml(`/${params["*"]}`), {
				headers: {
					"Content-Type": "text/html; charset=utf-8",
					"Cache-Control": "public, max-age=300",
				},
			}),
	)
	.get(
		"/sitemap.xml",
		async () =>
			new Response(await sitemapXml(), {
				headers: { "Content-Type": "application/xml; charset=utf-8" },
			}),
	)
	.get(
		"/robots.txt",
		() =>
			new Response(robotsTxt(), { headers: { "Content-Type": "text/plain" } }),
	)
	.get("/", () => "OK")
	.listen(3000, () => {
		console.log("Server is running on http://localhost:3000");
	});
