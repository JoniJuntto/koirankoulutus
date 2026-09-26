import type { Database } from "@koirankoulutus/db";
import { type SiteSettings, setting } from "@koirankoulutus/db/schema/cms";

import { protectedProcedure, publicProcedure, router } from "../index";
import { settingsInput } from "../schemas";

export const defaultSettings: SiteSettings = {
	phone: "",
	email: "",
	businessId: "",
	facebook: "",
	footerText: "",
	defaultDescription: "",
};

export async function getSettings(db: Database): Promise<SiteSettings> {
	const [row] = await db.select().from(setting);
	return { ...defaultSettings, ...row?.data };
}

export const settingsRouter = router({
	get: publicProcedure.query(({ ctx }) => getSettings(ctx.db)),

	update: protectedProcedure
		.input(settingsInput)
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.insert(setting)
				.values({ id: 1, data: input })
				.onConflictDoUpdate({ target: setting.id, set: { data: input } });
		}),
});
