import { cors } from "@elysiajs/cors";
import { appRouter } from "@koirankoulutus/api/routers/index";
import { runMigrations } from "@koirankoulutus/db";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
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
import { ensureAdmin, seedCourses } from "./seed";
import { auth, db } from "./services";

initLogger({
	env: { service: "koirankoulutus-server" },
});

// cwd is apps/server both in dev and in the Docker image.
await runMigrations(db, "../../packages/db/src/migrations");
await ensureAdmin(db, ENV.ADMIN_EMAIL, ENV.ADMIN_PASSWORD);
await seedCourses(db);

const identifyUser = createAuthMiddleware(auth as BetterAuthInstance, {
	exclude: ["/api/auth/**"],
	maskEmail: true,
});

new Elysia()
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
	.get("/", () => "OK")
	.listen(3000, () => {
		console.log("Server is running on http://localhost:3000");
	});
