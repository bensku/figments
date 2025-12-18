import { S3 } from '@hocuspocus/extension-s3';
import { Hocuspocus } from '@hocuspocus/server';
import { watchSpace } from '@/llm/watcher';

const isDev = process.env.NODE_ENV !== 'production';

const s3Extension = new S3({
    bucket: process.env.S3_BUCKET || 'hocuspocus',
    region: process.env.S3_REGION || 'us-east-1',
    ...(isDev && {
        endpoint: process.env.S3_ENDPOINT || 'http://localhost:4566',
        forcePathStyle: true,
        credentials: {
            accessKeyId: 'test',
            secretAccessKey: 'test',
        },
    }),
    ...(!isDev &&
        process.env.S3_ACCESS_KEY_ID &&
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
