import { ENV } from "../env";

const MAX_EDGE = 1600;

const toBlob = (canvas: HTMLCanvasElement, type: string) =>
	new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));

// Phone photos are often 5–10 MB; shrink in the browser so uploads are quick and the server
// needs no image library. Safari can't encode WebP and silently returns PNG, so fall back to JPEG.
async function shrink(file: File): Promise<Blob> {
	const bitmap = await createImageBitmap(file).catch(() => null);
	if (!bitmap)
		throw new Error(`"${file.name}" ei ole kuva, jota selain osaa avata.`);
	const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
	const canvas = document.createElement("canvas");
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);
	canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();
	const webp = await toBlob(canvas, "image/webp");
	if (webp?.type === "image/webp") return webp;
	const jpeg = await toBlob(canvas, "image/jpeg");
	if (!jpeg) throw new Error(`Kuvan "${file.name}" käsittely epäonnistui.`);
	return jpeg;
}

// "koira_metsassa-2.jpg" -> "koira metsassa 2". Camera names like IMG_1234 give "".
export function altFromFileName(name: string) {
	const base = name.replace(/\.[^.]+$/, "");
	if (/^(img|dsc|pxl|photo|image|screenshot)[\s_-]?\d/i.test(base)) return "";
	return base.replace(/[_-]+/g, " ").trim().slice(0, 300);
}

export type UploadedMedia = { id: string; key: string; alt: string };

export async function uploadImage(file: File): Promise<UploadedMedia> {
	const body = new FormData();
	body.append("file", await shrink(file), file.name);
	body.append("alt", altFromFileName(file.name));
	const res = await fetch(
		`${ENV.VITE_SERVER_URL.replace(/\/$/, "")}/api/media`,
		{
			method: "POST",
			body,
			credentials: "include",
		},
	).catch(() => null);
	if (!res) throw new Error("Yhteys palvelimeen katkesi. Yritä uudelleen.");
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(data.error ?? `Kuvan "${file.name}" lataus epäonnistui.`);
	return data;
}
