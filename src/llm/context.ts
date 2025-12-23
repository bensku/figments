import { and, eq, getKey, type Row, select } from '@bensku/y-query';
import type { AssistantContent, ModelMessage, TextPart, UserContent } from 'ai';
import type * as Y from 'yjs';
import { FragmentTable, NodeTable } from '@/tables/node';

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

    // Replace empty messages with placeholder content so that e.g. Anthropic API will work
    // Normally, empty messages should only occur due to bugs in Figments
    for (const message of messages) {
        if (message.content.length === 0) {
            message.content = [{ type: 'text', text: '(empty)' }];
        }
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
            // User messages can only have text parts
            return {
                role: 'user',
                content: parts.filter(
                    (p): p is TextPart => p.type === 'text',
                ) as UserContent,
            };
        case 'llm':
            return {
                role: 'assistant',
                content: parts as AssistantContent,
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
        case 'error':
        case 'warning':
            return {
                type: 'text',
                text: data.message
            };
        default:
            throw new Error();
    }
}
