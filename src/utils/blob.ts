import path from 'node:path';

/**
 * Very simple blob storage that can be read from and written to.
 */
export interface BlobStorage {
    read(path: string): Promise<ArrayBuffer | null>;
    write(path: string, data: ArrayBuffer | Uint8Array | File): Promise<void>;
}

class S3BlobStorage implements BlobStorage {
    async read(path: string): Promise<ArrayBuffer | null> {
        const file = Bun.s3.file(path);
        if (await file.exists()) {
            return file.arrayBuffer();
        }
        return null;
    }
    async write(
        path: string,
        data: ArrayBuffer | Uint8Array | File,
    ): Promise<void> {
        await Bun.s3.write(path, data);
    }
}

class LocalBlobStorage implements BlobStorage {
    directory: string;
    constructor(directory: string) {
        this.directory = path.resolve(directory);
    }

    #makePath(filePath: string) {
        if (path.isAbsolute(filePath)) {
            throw new Error(); // Indicates a bug in figments
        }
        const fullPath = path.resolve(this.directory, filePath);
        if (!fullPath.startsWith(this.directory)) {
            throw new Error(); // Guard against path traversal
        }
        return fullPath;
    }

    async read(path: string): Promise<ArrayBuffer | null> {
        const file = Bun.file(this.#makePath(path));
        if (await file.exists()) {
            return file.arrayBuffer();
        }
        return null;
    }
    async write(
        path: string,
        data: ArrayBuffer | Uint8Array | File,
    ): Promise<void> {
        await Bun.write(this.#makePath(path), data);
    }
}

/**
 * Blob storage that Figments can store data to.
 */
export const BLOBS: BlobStorage = process.env.FIGMENTS_DATA_DIR
    ? new LocalBlobStorage(process.env.FIGMENTS_DATA_DIR)
    : new S3BlobStorage();
