import { table } from '@bensku/y-query';
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
    }),
);

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
         * When this fragment was created. This is used to sort fragments of
         * same role in the UI.
         */
        createdAt: z.number(),

        data: z.discriminatedUnion('type', [
            z.object({
                type: z.literal('thinking'),
                text: z.instanceof(Y.Text).meta({ syncAs: Y.Text }),
                // TODO encrypted thinking?
            }),
            z.object({
                type: z.literal('toolCall'),
                // TODO
            }),
            z.object({
                type: z.literal('toolResult'),
                // TODO
            }),
            z.object({
                type: z.literal('text'),
                text: z.instanceof(Y.Text).meta({ syncAs: Y.Text }),
            }),
            z.object({
                type: z.literal('file'),
                attachmentId: z.string(),
                mediaType: z.string(),
                filename: z.string(),
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
