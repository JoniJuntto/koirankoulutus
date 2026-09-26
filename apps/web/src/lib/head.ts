export const pageHead = (title: string, description?: string) => () => ({
	meta: [
		{ title: `${title} | koirankoulutus Nyt ja Tässä` },
		...(description ? [{ name: "description", content: description }] : []),
	],
});
