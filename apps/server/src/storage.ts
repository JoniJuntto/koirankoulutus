import type { Storage } from "@koirankoulutus/api/storage";
import { S3Client } from "bun";

export function createS3Storage(env: {
	S3_ENDPOINT: string;
	S3_BUCKET: string;
	S3_ACCESS_KEY_ID: string;
	S3_SECRET_ACCESS_KEY: string;
}): Storage {
	const s3 = new S3Client({
		endpoint: env.S3_ENDPOINT,
		bucket: env.S3_BUCKET,
		accessKeyId: env.S3_ACCESS_KEY_ID,
		secretAccessKey: env.S3_SECRET_ACCESS_KEY,
	});
	return {
		async put(key, body, type) {
			await s3.write(key, body, { type });
		},
		// Streamed through the server: passing an S3File to Response would redirect to MinIO,
		// which isn't reachable from the internet.
		get: (key) => s3.file(key).stream(),
		exists: (key) => s3.exists(key),
		async delete(key) {
			await s3.delete(key);
		},
	};
}
