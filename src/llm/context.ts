import { and, eq, getKey, type Row, select } from '@bensku/y-query';
import type { ModelMessage, UserContent } from 'ai';
import type * as Y from 'yjs';
import { FragmentTable, NodeTable } from '@/tables/node';
import {
    tryConvertToText as convertToText,
    loadAttachment,
} from './attachment';
import type { Model } from './model';

export async function loadContext(
    userId: string,
    spaceId: string,
    doc: Y.Doc,
    targetNode: Row<typeof NodeTable>,
    model: Model,
    options: {
        includeTarget?: boolean;
        filterReasoning?: boolean;
    },
): Promise<ModelMessage[]> {
    // Get a chain of nodes from root to target
    const nodes = [];
    if (options.includeTarget) {
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
    const futures: Promise<ModelMessage[]>[] = [];
    for (const node of nodes) {
        // For now, only take the main fragments
        const fragments = select(
            doc,
            FragmentTable,
            and(eq('node', node.key), eq('role', 'main')),
        );
        fragments.sort((a, b) => a.createdAt - b.createdAt);
        futures.push(
            toMessages(
                userId,
                spaceId,
                node.role,
                fragments,
                model,
                !!options.filterReasoning,
            ),
        );
    }
    const messages = (await Promise.all(futures)).flat();

    // Replace empty messages with placeholder content so that e.g. Anthropic API will work
    // Normally, empty messages should only occur due to bugs in Figments
    for (const message of messages) {
        if (message.content.length === 0) {
            message.content = [{ type: 'text', text: '(empty)' }];
        }
    }

    return messages;
}

async function toMessages(
    userId: string,
    spaceId: string,
    creator: Row<typeof NodeTable>['role'],
    fragments: Row<typeof FragmentTable>[],
    model: Model,
    filterReasoning: boolean,
): Promise<ModelMessage[]> {
    const allParts = await Promise.all(
        fragments.map((f) => toPart(userId, spaceId, f, model)),
    );
    // Filter out reasoning if requested
    const parts = !filterReasoning
        ? allParts
        : allParts.filter((part) => part.type !== 'reasoning');

    switch (creator) {
        case 'user':
            return [
                {
                    role: 'user',
                    content: parts as UserContent,
                },
            ];
        case 'llm': {
            const messages: ModelMessage[] = [
                {
                    role: 'assistant',
                    content: [],
                },
            ];
            let toolInProgress = false;
            for (const part of parts) {
                if (part.type === 'turn_end') {
                    // Begin new message, initially tool call, then assistant response
                    messages.push({
                        role: !toolInProgress ? 'tool' : 'assistant',
                        content: [],
                    });
                    toolInProgress = !toolInProgress;
                } else {
                    // Append to currently processed message
                    (messages[messages.length - 1]?.content as unknown[]).push(
                        part,
                    );
                }
            }
            // turn_end always appends a new message
            // However, after last turn we do NOT want a new empty message, so delete it
            if (messages[messages.length - 1]?.content.length === 0) {
                delete messages[messages.length - 1];
            }

            return messages;
        }
    }
}

async function toPart(
    userId: string,
    spaceId: string,
    fragment: Row<typeof FragmentTable>,
    model: Model,
) {
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
            const content = await loadAttachment(
                userId,
                spaceId,
                data.attachmentId,
                data.mediaType,
            );
            if (!content) {
                throw new Error(`missing file ${data.attachmentId}`);
            }
            if (model.config.supportedMediaTypes.includes(data.mediaType)) {
                return {
                    type: 'file',
                    data: content,
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
                    content,
                    data.mediaType,
                    data.filename,
                );
                return {
                    type: 'text',
                    text,
                };
            }
        }
        case 'turn_end':
            return {
                type: 'turn_end',
            };
        case 'error':
        case 'warning':
            return {
                type: 'text',
                text: data.message,
            };
        default:
            throw new Error(
                `unknown fragment type: ${(data as { type: string }).type}`,
            );
    }
}
