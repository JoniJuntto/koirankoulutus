import { createDb } from "@koirankoulutus/db";

import type { Storage } from "./storage";

// Tests need the dev database: `bun run db:start`, then `bun test` in packages/api.
export const testDb = createDb({
	DATABASE_URL:
		process.env.DATABASE_URL ??
		"postgresql://postgres:password@localhost:5432/koirankoulutus",
});

export function memoryStorage() {
	const objects = new Map<string, { body: Blob; type: string }>();
	const storage: Storage = {
		async put(key, body, type) {
			objects.set(key, { body, type });
		},
		get(key) {
			const o = objects.get(key);
			if (!o) throw new Error("missing");
			return o.body.stream();
		},
		async exists(key) {
			return objects.has(key);
		},
		async delete(key) {
			objects.delete(key);
		},
	};
	return { storage, objects };
}
