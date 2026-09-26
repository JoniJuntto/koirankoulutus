// Photos bundled with the site (landing page, thank-you page). Everything else uses the media library.
export const img = (file: string) => `/images/${file}`;

// "040 123 4567" -> "tel:+358401234567"
export const phoneHref = (phone: string) =>
	`tel:${phone.replace(/[^\d+]/g, "").replace(/^0/, "+358")}`;
