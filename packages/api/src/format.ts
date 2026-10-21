export const formatPrice = (cents: number) =>
	new Intl.NumberFormat("fi-FI", { style: "currency", currency: "EUR" }).format(
		cents / 100,
	);

export const formatDate = (isoDate: string) =>
	new Date(`${isoDate}T12:00:00`).toLocaleDateString("fi-FI");

export const dateRange = (e: { startsOn: string; endsOn: string }) =>
	e.startsOn === e.endsOn
		? formatDate(e.startsOn)
		: `${formatDate(e.startsOn)}–${formatDate(e.endsOn)}`;

// "Jäljestyksen perusteet!" -> "jaljestyksen-perusteet"
export const slugify = (s: string) =>
	s
		.toLowerCase()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 80)
		.replace(/-$/, "");

// Uploaded photos are served by the server at /media/<key> (proxied by nginx / Vite).
export const mediaUrl = (key: string) => `/media/${key}`;

// Accepts a Date or the ISO string tRPC sends over JSON.
export const formatDay = (d: Date | string) =>
	new Date(d).toLocaleDateString("fi-FI", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});

// "2026-10-21" in Finland, wherever the code runs (sv-SE formats dates as ISO).
export const today = () =>
	new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Helsinki" });
