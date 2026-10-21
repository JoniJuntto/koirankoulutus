import { expect, test } from "bun:test";

import { monthWeeks, overlaps, shiftMonth } from "./month-grid";

test("month starting on Sunday gets a full leading week", () => {
	// 1.3.2026 is a Sunday.
	const weeks = monthWeeks("2026-03");
	expect(weeks[0]).toEqual([
		"2026-02-23",
		"2026-02-24",
		"2026-02-25",
		"2026-02-26",
		"2026-02-27",
		"2026-02-28",
		"2026-03-01",
	]);
	expect(weeks.at(-1)?.at(-1)).toBe("2026-04-05");
	expect(weeks).toHaveLength(6);
});

test("month starting on Monday has no leading days", () => {
	expect(monthWeeks("2026-06")[0]?.[0]).toBe("2026-06-01");
});

test("event over a month boundary shows in both months", () => {
	const e = { startsOn: "2026-10-31", endsOn: "2026-11-01" };
	expect(overlaps(e, "2026-10-31", "2026-10-31")).toBe(true);
	expect(overlaps(e, "2026-11-01", "2026-11-01")).toBe(true);
	expect(overlaps(e, "2026-11-02", "2026-11-30")).toBe(false);
});

test("shiftMonth crosses years", () => {
	expect(shiftMonth("2026-12", 1)).toBe("2027-01");
	expect(shiftMonth("2026-01", -1)).toBe("2025-12");
});
