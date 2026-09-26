// ponytail: in-memory, per process. Resets on restart; move to Postgres/Redis if running several instances.
const hits = new Map<string, number[]>();

export function isRateLimited(
	key: string,
	max: number,
	windowMs: number,
	now = Date.now(),
) {
	const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
	if (recent.length >= max) {
		hits.set(key, recent);
		return true;
	}
	recent.push(now);
	hits.set(key, recent);
	return false;
}
