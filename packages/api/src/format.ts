export const formatPrice = (cents: number) =>
	new Intl.NumberFormat("fi-FI", { style: "currency", currency: "EUR" }).format(
		cents / 100,
	);

export const formatDate = (isoDate: string) =>
	new Date(`${isoDate}T12:00:00`).toLocaleDateString("fi-FI");
