// MOCK: contact details and business ID are placeholders until Teija provides the real ones.
export const contact = {
	phone: "040 123 4567",
	phoneHref: "tel:+358401234567",
	email: "teija@example.com",
	businessId: "1234567-8",
	facebook:
		"https://www.facebook.com/p/koirankoulutus-Nyt-ja-T%C3%A4ss%C3%A4-61562406327189/",
};

export const courseImages = Array.from(
	{ length: 14 },
	(_, i) => `${i + 1}.jpg`,
);

export const img = (file: string) => `/images/${file}`;
