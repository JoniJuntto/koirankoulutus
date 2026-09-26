// Object storage for uploaded images. The server implements it with Bun's S3Client (MinIO);
// tests pass an in-memory fake.
export type Storage = {
	put(key: string, body: Blob, type: string): Promise<void>;
	get(key: string): ReadableStream;
	exists(key: string): Promise<boolean>;
	delete(key: string): Promise<void>;
};
