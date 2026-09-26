import { useSuspenseQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";

// Loaded by the _site layout loader, so this never suspends on public pages.
export const useSettings = () =>
	useSuspenseQuery(trpc.settings.get.queryOptions()).data;
