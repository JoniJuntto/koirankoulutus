import type { Database } from "@koirankoulutus/db";
import { media } from "@koirankoulutus/db/schema/cms";

import type { Storage } from "./storage";

export { mediaUrl } from "./format";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export class UploadError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
	}
}

// The browser's Content-Type is not trusted; look at the file's first bytes. No SVG (it can carry scripts).
function sniff(b: Uint8Array): { mime: string; ext: string } | null {
	if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
		return { mime: "image/jpeg", ext: "jpg" };
	if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
		return { mime: "image/png", ext: "png" };
	const ascii = (from: number, to: number) =>
		String.fromCharCode(...b.slice(from, to));
	if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP")
		return { mime: "image/webp", ext: "webp" };
	return null;
}

export async function uploadMedia(
	deps: { db: Database; storage: Storage },
	file: Blob,
	alt: string,
) {
	if (file.size > MAX_UPLOAD_BYTES)
		throw new UploadError("Kuva on liian suuri (yli 5 Mt).", 413);
	const type = sniff(new Uint8Array(await file.arrayBuffer()).subarray(0, 12));
	if (!type)
		throw new UploadError("Tiedosto ei ole kuva (JPEG, PNG tai WebP).", 415);

	const key = `${crypto.randomUUID()}.${type.ext}`;
	await deps.storage.put(key, file, type.mime);
	try {
		const [row] = await deps.db
			.insert(media)
			.values({ key, mime: type.mime, alt: alt.trim().slice(0, 300) })
			.returning();
		if (!row) throw new Error("media insert failed");
		return row;
	} catch (e) {
		await deps.storage.delete(key).catch(() => {});
		throw e;
	}
}
