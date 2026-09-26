import { publicProcedure, router } from "../index";
import { coursesRouter } from "./courses";
import { requestsRouter } from "./requests";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => "OK"),
	courses: coursesRouter,
	requests: requestsRouter,
});
export type AppRouter = typeof appRouter;
