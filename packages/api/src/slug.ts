import type { Database } from "@koirankoulutus/db";
import { eq, like, or } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

import { slugify } from "./format";

// First free slug among base, base-2, base-3, …
export async function uniqueSlug(
	db: Database,
	table: PgTable & { slug: PgColumn },
	title: string,
	reserved: ReadonlySet<string> = new Set(),
) {
	const base = slugify(title) || "sivu";
	const rows = await db
		.select({ slug: table.slug })
		.from(table)
		.where(or(eq(table.slug, base), like(table.slug, `${base}-%`)));
	const taken = new Set([...reserved, ...rows.map((r) => r.slug as string)]);
	if (!taken.has(base)) return base;
	for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}
