import { getKey, type Row, upsert } from '@bensku/y-query';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import { sendMessage } from '@/sync/hocuspocus';
import { FragmentTable, NodeTable } from '@/tables/node';
import type { PersonaTable } from '@/tables/persona';

export type FileAttachment = {
    id: string;
    mediaType: string;
    filename: string;
};

export function useSendMessage(
    doc: Y.Doc,
    provider: HocuspocusProvider | null,
    parentNode: Row<typeof NodeTable> | null,
    personas: Row<typeof PersonaTable>[],
    selectNode: (id: string | null) => void,
) {
    const sendReply = (text: string, files?: FileAttachment[]) => {
        if (!provider) return;
        if (!text.trim() && (!files || files.length === 0)) return;

        const parentId = parentNode?.key ?? 'root';

        let offset = 0;

        // Submit user message
        const nodeKey = crypto.randomUUID();
        upsert(doc, NodeTable, {
            key: nodeKey,
            parentId,
            role: 'user',
            createdAt: Date.now(),
            author: '',
            summary: text,
            completed: true,
        });

        // Create text fragment (if there's text)
        const fragmentKey = crypto.randomUUID();
        if (text.trim()) {
            upsert(doc, FragmentTable, {
                key: fragmentKey,
                node: nodeKey,
                role: 'main',
                offset: offset++,
                createdAt: Date.now(),
                data: {
                    type: 'text',
                    text: new Y.Text(),
                },
            });

            const userFragment = getKey(doc, FragmentTable, fragmentKey);
            if (userFragment?.data.type === 'text') {
                userFragment.data.text.insert(0, text);
            }
        }

        // Create file fragments with incrementing timestamps
        for (const file of files ?? []) {
            upsert(doc, FragmentTable, {
                key: crypto.randomUUID(),
                node: nodeKey,
                role: 'main',
                offset: offset++,
                createdAt: Date.now(),
                data: {
                    type: 'file',
                    attachmentId: file.id,
                    mediaType: file.mediaType,
                    filename: file.filename,
                },
            });
        }

        // Request LLM nodes to be generated as replies
        let nodeToSelect = nodeKey;
        for (const persona of personas) {
            const replyKey = crypto.randomUUID();
            upsert(doc, NodeTable, {
                key: replyKey,
                parentId: nodeKey,
                role: 'llm',
                createdAt: Date.now(),
                author: persona.key,
                summary: '',
                completed: false,
            });

            // Request generation via stateless message
            sendMessage(provider, {
                type: 'generate',
                node: replyKey,
                role: 'main',
                force: false,
            });

            if (personas.length === 1) {
                nodeToSelect = replyKey;
            }
        }

        selectNode(nodeToSelect);
        return nodeKey;
    };

    return sendReply;
}
