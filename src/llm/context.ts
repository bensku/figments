import { and, eq, getKey, type Row, select } from '@bensku/y-query';
import type { AssistantContent, ModelMessage, UserContent } from 'ai';
import type * as Y from 'yjs';
import { FragmentTable, NodeTable } from '@/tables/node';
import { tryConvertToText as convertToText } from './attachment';
import type { Model } from './model';

export async function loadContext(
    doc: Y.Doc,
    targetNode: Row<typeof NodeTable>,
    model: Model,
    includeTarget = false,
): Promise<ModelMessage[]> {
    // Get a chain of nodes from root to target
    const nodes = [];
    if (includeTarget) {
        nodes.push(targetNode);
    }

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
    const futures: Promise<ModelMessage>[] = [];
    for (const node of nodes) {
        // For now, only take the main fragments
        const fragments = select(
            doc,
            FragmentTable,
            and(eq('node', node.key), eq('role', 'main')),
        );
        fragments.sort((a, b) => a.createdAt - b.createdAt);
        futures.push(toMessage(node.role, fragments, model));
    }
    const messages = await Promise.all(futures);

    // Replace empty messages with placeholder content so that e.g. Anthropic API will work
    // Normally, empty messages should only occur due to bugs in Figments
    for (const message of messages) {
        if (message.content.length === 0) {
            message.content = [{ type: 'text', text: '(empty)' }];
        }
    }

    return messages;
}

async function toMessage(
    creator: Row<typeof NodeTable>['role'],
    fragments: Row<typeof FragmentTable>[],
    model: Model,
): Promise<ModelMessage> {
    const allParts = await Promise.all(fragments.map((f) => toPart(f, model)));
    // Filter out tool calls and tool results - they were already consumed
    // during the original generation; the text response is what matters
    const parts = allParts;

    switch (creator) {
        case 'user':
            return {
                role: 'user',
                content: parts as UserContent,
            };
        case 'llm':
            return {
                role: 'assistant',
                content: parts as AssistantContent,
            };
    }
}

async function toPart(fragment: Row<typeof FragmentTable>, model: Model) {
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
                providerOptions: data.providerOptions,
            };
        case 'toolCall':
            return {
                type: 'tool-call',
                toolCallId: data.callId,
                toolName: data.toolName,
                input: data.input,
                providerExecuted: data.providerExecuted,
                providerOptions: data.providerOptions,
            };
        case 'toolResult':
            return {
                type: 'tool-result',
                toolCallId: data.callId,
                toolName: data.toolName,
                output: {
                    type: 'json',
                    value: data.output,
                },
                providerOptions: data.providerOptions,
            };
        case 'file': {
            // TODO optionally use presigned URLs to avoid downloading data in memory
            const content = Bun.s3.file(`uploads/${data.attachmentId}`);
            if (model.config.supportedMediaTypes.includes(data.mediaType)) {
                return {
                    type: 'file',
                    data: await content.arrayBuffer(),
                    mediaType: data.mediaType,
                    filename: data.filename,
                    // Enable citations for documents (PDFs)
                    providerOptions: {
                        anthropic: {
                            citations: { enabled: true },
                            title: data.filename,
                        },
                    },
                };
            } else {
                const text = convertToText(
                    await content.arrayBuffer(),
                    data.mediaType,
                    data.filename,
                );
                return {
                    type: 'text',
                    text,
                };
            }
        }
        case 'error':
        case 'warning':
            return {
                type: 'text',
                text: data.message,
            };
        default:
            throw new Error();
    }
}
