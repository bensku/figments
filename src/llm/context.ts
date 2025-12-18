import { FragmentTable, NodeTable } from '@/tables/node';
import { and, eq, getKey, select, type Row } from '@bensku/y-query';
import type { ModelMessage } from 'ai';
import type * as Y from 'yjs';

export function loadContext(
    doc: Y.Doc,
    targetNode: Row<typeof NodeTable>,
): ModelMessage[] {
    // Get a chain of nodes from root to target
    const nodes = [];
    let node = targetNode;
    for (;;) {
        const parent = getKey(doc, NodeTable, node.parentId);
        if (!parent) {
            break;
        }
        nodes.push(parent);
        node = parent;
    }
    nodes.reverse();

    // Convert each node into a message
    const messages: ModelMessage[] = [];
    for (const node of nodes) {
        // For now, only take the main fragments
        const fragments = select(
            doc,
            FragmentTable,
            and(eq('node', node.key), eq('role', 'main')),
        );
        fragments.sort((a, b) => a.createdAt - b.createdAt);
        messages.push(toMessage(node.role, fragments));
    }

    return messages;
}

function toMessage(
    creator: Row<typeof NodeTable>['role'],
    fragments: Row<typeof FragmentTable>[],
): ModelMessage {
    const parts = fragments.map(toPart);
    switch (creator) {
        case 'user':
            return {
                role: 'user',
                content: parts as any,
            };
        case 'llm':
            return {
                role: 'assistant',
                content: parts as any,
            };
    }
}

function toPart(fragment: Row<typeof FragmentTable>) {
    const data = fragment.data;
    switch (data.type) {
        case 'text':
            return {
                type: 'text',
                text: data.text.toString(),
            };
        case 'thinking':
            return {
                type: 'reasoning',
                text: data.text.toString(),
            };
        case 'toolCall':
            throw new Error();
        case 'toolResult':
            throw new Error();
    }
    throw new Error();
}
