import { S3 } from '@hocuspocus/extension-s3';
import { Hocuspocus } from '@hocuspocus/server';
import { watchSpace } from '@/llm/watcher';

const s3Extension = new S3({
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_PATH_STYLE === 'true',
    bucket: process.env.S3_BUCKET,
    ...(process.env.S3_ACCESS_KEY_ID &&
        process.env.S3_SECRET_ACCESS_KEY && {
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            },
        }),
});

export const hocuspocus = new Hocuspocus({
    extensions: [s3Extension],

    async onLoadDocument(data) {
        unwatchFuncs.set(data.documentName, watchSpace(data.document));
    },

    async afterUnloadDocument(data) {
        const unwatch = unwatchFuncs.get(data.documentName);
        if (unwatch) {
            unwatch();
            unwatchFuncs.delete(data.documentName);
        }
    },
});

const unwatchFuncs: Map<string, () => void> = new Map();
