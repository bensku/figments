import { eq, getKey, remove, select, table } from '@bensku/y-query';
import * as Y from 'yjs';
import z from 'zod';

/**
 * Node in a chat tree. This represents roughly one message, either
 * user or LLM sent.
 */
export const NodeTable = table(
    'nodes',
    z.object({
        key: z.string(),

        /**
         * Id of parent node, or 'root' if this is root node.
         */
        parentId: z.string(),

        /**
         * What created this node.
         */
        role: z.enum(['user', 'llm']),

        /**
         * Timestamp of creation.
         */
        createdAt: z.number(),

        /**
         * For LLM-created nodes, the "persona" to use. A persona is a
         * collection of the model, its configuration (including tools) and
         * (system) prompt.
         */
        author: z.string(),

        /**
         * Summary of the node's content.
         */
        summary: z.string(),

        /**
         * Whether or not this node has been completed. For user nodes,
         * incomplete ones are displayed only in input area. For LLM nodes,
         * a graphic is shown to indicate the model is still generating.
         */
        completed: z.boolean(),

        /**
         * Number of input tokens reported by the model provider for this
         * generation. Optional because not all providers report usage.
         */
        inputTokens: z.number().optional(),

        /**
         * Number of input tokens that the provider reported as cached.
         * Should be smaller than total input tokens. Cached tokens are
         * typically cheaper, so users/instance admins might be interested
         * in knowing how well they're utilized.
         */
        cachedInputTokens: z.number().optional(),

        /**
         * Number of output tokens reported by the model provider for this
         * generation. Optional because not all providers report usage.
         */
        outputTokens: z.number().optional(),
    }),
);

/**
 * Citation from a source (web search result, document, etc.)
 */
const Citation = z.object({
    type: z.enum([
        'web_search_result_location',
        'char_location',
        'page_location',
    ]),
    url: z.string().optional(),
    title: z.string().optional(),
    citedText: z.string().optional(),
    // PDF citations (page_location)
    startPageNumber: z.number().optional(),
    endPageNumber: z.number().optional(),
    // Plain text citations (char_location)
    startCharIndex: z.number().optional(),
    endCharIndex: z.number().optional(),
});

/**
 * Part of a node in chat tree. Nodes themself do not have content, it
 * is attached to them through use of fragments.
 */
export const FragmentTable = table(
    'fragments',
    z.object({
        key: z.string(),
        node: z.string(),

        /**
         * Role of this fragment.
         *
         * main: Main node content.
         */
        role: z.enum(['main']),

        /**
         * Offset in node. Fragments are sorted by their offsets in ascending
         * order.
         */
        offset: z.int(),

        /**
         * When this fragment was created. This is used to sort fragments of
         * same role in the UI.
         */
        createdAt: z.number(),

        data: z.discriminatedUnion('type', [
            z.object({
                type: z.literal('thinking'),
                text: z.instanceof(Y.Text).meta({ syncAs: Y.Text }),
                providerOptions: z.any(),
            }),
            z.object({
                type: z.literal('toolCall'),
                callId: z.string(),
                toolName: z.string(),
                input: z.any(),
                providerExecuted: z.boolean().optional(),
                providerOptions: z.any().optional(),
            }),
            z.object({
                type: z.literal('toolResult'),
                callId: z.string(),
                toolName: z.string(),
                output: z.any(),
                providerOptions: z.any().optional(),
            }),
            z.object({
                type: z.literal('text'),
                text: z.instanceof(Y.Text).meta({ syncAs: Y.Text }),
                citations: z.array(Citation).optional(),
            }),
            z.object({
                type: z.literal('file'),
                attachmentId: z.string(),
                mediaType: z.string(),
                filename: z.string(),
            }),
            z.object({
                type: z.literal('turn_end'),
            }),
            // Abnormal fragment types
            z.object({
                type: z.literal('error'),
                kind: z.enum(['internal']),
                message: z.string(),
            }),
            z.object({
                type: z.literal('warning'),
                message: z.string(),
            }),
        ]),
    }),
);

/**
 * Generated replies to nodes. User can take these in lieu of writing replies
 * themself.
 */
export const ChoiceTable = table(
    'choices',
    z.object({
        key: z.string(),
        node: z.string(),

        /**
         * Ordinal of this choice.
         */
        ordinal: z.number(),

        /**
         * The choice text (literally the LLM prompt).
         */
        value: z.string(),

        /**
         * If this choice has been already taken: the node that was created
         * for it. This leads to node that has the choice's text
         */
        takesTo: z.string().optional(),
    }),
);

/**
 * Node events. Used for tracking how fast things happened.
 */
export const EventTable = table(
    'events',
    z.object({
        key: z.string(),
        node: z.string(),

        type: z.enum([
            'generate_start',
            'context_ready',
            'stream_start',
            'first_token',
            'stream_end',
        ]),
        time: z.int(),
    }),
);

/**
 * Deletes a node and all its descendants (cascade delete).
 * Also removes all fragments and choices associated with deleted nodes.
 * @param doc The Y.Doc to operate on
 * @param nodeKey Key of the node to delete
 * @returns The parent ID of the deleted node (null if parent was 'root')
 */
export function deleteNodeWithDescendants(
    doc: Y.Doc,
    nodeKey: string,
): string | null {
    // Get parent before deletion for navigation
    const node = getKey(doc, NodeTable, nodeKey);
    const parentId = node?.parentId ?? null;

    // Collect all node keys to delete (BFS traversal)
    const toDelete: string[] = [nodeKey];
    let i = 0;
    while (i < toDelete.length) {
        const currentKey = toDelete[i];
        if (currentKey) {
            const children = select(doc, NodeTable, eq('parentId', currentKey));
            for (const child of children) {
                toDelete.push(child.key);
            }
        }
        i++;
    }

    // Delete fragments, choices, events, then nodes
    for (const key of toDelete) {
        const fragments = select(doc, FragmentTable, eq('node', key));
        for (const fragment of fragments) {
            remove(doc, FragmentTable, fragment.key);
        }
        const choices = select(doc, ChoiceTable, eq('node', key));
        for (const choice of choices) {
            remove(doc, ChoiceTable, choice.key);
        }
        const events = select(doc, EventTable, eq('node', key));
        for (const event of events) {
            remove(doc, EventTable, event.key);
        }
        remove(doc, NodeTable, key);
    }

    return parentId === 'root' ? null : parentId;
}
