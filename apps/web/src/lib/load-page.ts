import { notFound } from "@tanstack/react-router";

import type { RouterAppContext } from "@/routes/__root";

export async function loadPage(
	{ queryClient, trpc }: RouterAppContext,
	slug: string,
) {
	const page = await queryClient.ensureQueryData(
		trpc.pages.get.queryOptions({ slug }),
	);
	if (!page) throw notFound();
	return page;
}
