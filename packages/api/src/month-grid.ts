// Calendar month as weeks of ISO dates (Monday first). Dates stay strings
// ("2026-11-07"), computed in UTC, so no timezone or DST can shift a day.

const iso = (d: Date) => d.toISOString().slice(0, 10);
const day = 86_400_000;

// "2026-11" -> "2026-12" with delta 1.
export function shiftMonth(month: string, delta: number) {
	const [y, m] = month.split("-").map(Number) as [number, number];
	return iso(new Date(Date.UTC(y, m - 1 + delta, 1))).slice(0, 7);
}

export function monthWeeks(month: string) {
	const [y, m] = month.split("-").map(Number) as [number, number];
	const first = Date.UTC(y, m - 1, 1);
	const last = Date.UTC(y, m, 0);
	const mondayOffset = (new Date(first).getUTCDay() + 6) % 7;
	const weeks: string[][] = [];
	for (let t = first - mondayOffset * day; t <= last; t += 7 * day)
		weeks.push(Array.from({ length: 7 }, (_, i) => iso(new Date(t + i * day))));
	return weeks;
}

export const overlaps = (
	e: { startsOn: string; endsOn: string },
	from: string,
	to: string,
) => e.startsOn <= to && e.endsOn >= from;
