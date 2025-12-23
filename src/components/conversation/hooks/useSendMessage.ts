import { getKey, type Row, upsert } from '@bensku/y-query';
import * as Y from 'yjs';
import { FragmentTable, NodeTable } from '@/tables/node';
import type { PersonaTable } from '@/tables/persona';

export function useSendMessage(
    doc: Y.Doc,
    parentNode: Row<typeof NodeTable> | null,
    personas: Row<typeof PersonaTable>[],
    selectNode: (id: string | null) => void,
) {
    const sendReply = (text: string) => {
        if (!text.trim()) return;

        const parentId = parentNode?.key ?? 'root';

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

        const fragmentKey = crypto.randomUUID();
        upsert(doc, FragmentTable, {
            key: fragmentKey,
            node: nodeKey,
            role: 'main',
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
            if (personas.length === 1) {
                nodeToSelect = replyKey;
            }
        }

        selectNode(nodeToSelect);
        return nodeKey;
    };

    return sendReply;
}
