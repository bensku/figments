import z from 'zod';

export const ClientMessage = z.discriminatedUnion('type', [
    /**
     * Request server to generate node's content.
     */
    z.object({
        type: z.literal('generate'),

        /**
         * Node id.
         */
        node: z.string(),

        /**
         * Fragment role to use. Currently, only main message content is supported.
         */
        role: z.enum(['main']),

        /**
         * If false, the node is only generated if it has no fragments.
         * If true, any existing fragments are deleted, after which the node is
         * generated.
         */
        force: z.boolean(),
    }),
]);
