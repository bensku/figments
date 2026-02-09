import { eq, getKey, remove, select } from '@bensku/y-query';
import { Database } from '@hocuspocus/extension-database';
import { Hocuspocus } from '@hocuspocus/server';
import type * as Y from 'yjs';
import { checkAccess } from '@/auth/acl';
import { type Session, validateId } from '@/auth/user';
import { generateFragments } from '@/llm/generate';
import { FragmentTable, NodeTable } from '@/tables/node';
import { ClientMessage } from './messages';

const s3Db = new Database({
    async fetch({ documentName }) {
        try {
            const file = Bun.s3.file(`docs/${documentName}`);
            if (!(await file.exists())) {
                // Document does not yet exist. This is completely normal
                return null;
            }
            return new Uint8Array(await file.arrayBuffer());
        } catch (e) {
            console.error(e);
            throw e;
        }
    },

    async store({ documentName, state }) {
        try {
            await Bun.s3.write(`docs/${documentName}`, state);
        } catch (e) {
            console.error(e);
            throw e;
        }
    },
});

export const hocuspocus = new Hocuspocus({
    extensions: [s3Db],

    async onAuthenticate(data) {
        // Validate that document name follows expected pattern
        const parts = data.documentName.split('/');
        if (parts.length !== 2) {
            console.warn('Invalid document name', data.documentName);
            throw new Error();
        }
        const userId = validateId(parts[0], 'user id');
        const docId = validateId(parts[1], 'doc id');

        // biome-ignore lint/suspicious/noExplicitAny: we're smuggling the User from Bun's router here
        const session = (data.request as any).session as Session; // We could use a fake HTTP header, but that'd be even bigger footgun

        // Access control
        if (docId === 'config') {
            // User config
            // TODO try to separate spaces of user better from other user data
            checkAccess(session, [
                { type: 'read-user', resource: userId },
                { type: 'write-user', resource: userId },
            ]);
        } else {
            // Access space nodes and other data
            checkAccess(session, [
                {
                    type: 'read-space',
                    resource: `${userId}/${docId}`,
                },
            ]);
            try {
                checkAccess(session, [
                    {
                        type: 'write-space',
                        resource: `${userId}/${docId}`,
                    },
                ]);
            } catch (_e) {
                // No write access
                data.connectionConfig.readOnly = true;
            }
        }

        return {
            session,
            userId,
            docId,
        };
    },

    async onStateless({ payload, connection }) {
        const message = ClientMessage.parse(JSON.parse(payload));
        const session = connection.context.session as Session;
        const userId = connection.context.userId as string;

        switch (message.type) {
            case 'generate': {
                checkAccess(session, [
                    {
                        type: 'write-space',
                        resource: `${userId}/${connection.context.docId}`,
                    },
                ]);
                // Open local connection to the doc
                // We're creating fragments async, and don't want them to be only partially saved if
                // the client happens to e.g. reconnect due to page refresh
                const documentName = `${userId}/${connection.context.docId}`;
                await openDocServer(documentName, async (doc) => {
                    const node = getKey(doc, NodeTable, message.node);
                    if (node) {
                        if (message.force) {
                            // If requested, DELETE all previous content
                            const fragments = select(
                                doc,
                                FragmentTable,
                                eq('node', node.key),
                            );
                            for (const fragment of fragments) {
                                remove(doc, FragmentTable, fragment.key);
                            }
                        }
                        // Generate content fragments
                        await generateFragments(
                            userId,
                            doc,
                            node,
                            message.role,
                            connection.context.docId,
                        );
                    } else {
                        console.warn(
                            'Missing node',
                            message.node,
                            'in doc',
                            documentName,
                            ', cannot generate it',
                        );
                    }
                });
                break;
            }
        }
    },
});

/**
 * Open a document on server, do things on it, then close it.
 */
export async function openDocServer(
    documentName: string,
    callback: (doc: Y.Doc) => Promise<void>,
) {
    const conn = await hocuspocus.openDirectConnection(documentName);
    if (!conn.document) {
        throw new Error();
    }
    await callback(conn.document);
    await conn.disconnect();
}
