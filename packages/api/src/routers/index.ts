import { publicProcedure, router } from "../index";
import { coursesRouter } from "./courses";
import { dogsRouter } from "./dogs";
import { mediaRouter } from "./media";
import { pagesRouter } from "./pages";
import { postsRouter } from "./posts";
import { requestsRouter } from "./requests";
import { settingsRouter } from "./settings";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => "OK"),
	courses: coursesRouter,
	requests: requestsRouter,
	pages: pagesRouter,
	posts: postsRouter,
	dogs: dogsRouter,
	media: mediaRouter,
	settings: settingsRouter,
});
export type AppRouter = typeof appRouter;
