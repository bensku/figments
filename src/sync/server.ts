import { eq, getKey, remove, select } from '@bensku/y-query';
import { Database } from '@hocuspocus/extension-database';
import { Hocuspocus } from '@hocuspocus/server';
import type { User } from '@/auth/user';
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
        const userId = parts[0];
        const docId = parts[1];

        // biome-ignore lint/suspicious/noExplicitAny: we're smuggling the User from Bun's router here
        const user = (data.request as any).user as User; // We could use a fake HTTP header, but that'd be even bigger footgun

        if (userId !== user.id) {
            console.warn(
                'User',
                user.id,
                'tried to access doc',
                docId,
                'from user',
                userId,
            );
            throw new Error();
        }
        return {
            user,
        };
    },

    async onStateless({ payload, connection }) {
        const message = ClientMessage.parse(JSON.parse(payload));
        switch (message.type) {
            case 'generate': {
                const node = getKey(
                    connection.document,
                    NodeTable,
                    message.node,
                );
                if (node) {
                    if (message.force) {
                        // If requested, DELETE all previous content
                        const fragments = select(
                            connection.document,
                            FragmentTable,
                            eq('node', node.key),
                        );
                        for (const fragment of fragments) {
                            remove(
                                connection.document,
                                FragmentTable,
                                fragment.key,
                            );
                        }
                    }
                    // Generate content fragments
                    generateFragments(
                        connection.context.user.id as string,
                        connection.document,
                        node,
                        message.role,
                    );
                }
                break;
            }
        }
    },
});
