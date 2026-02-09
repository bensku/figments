import { table } from '@bensku/y-query';
import z from 'zod';

/**
 * Active share tokens of a space.
 */
export const ShareTokenTable = table(
    'sharelinks',
    z.object({
        /**
         * The share token.
         */
        key: z.string(),

        /**
         * Whether or not this token is active.
         */
        active: z.boolean(),

        /**
         * Whether or not to add write-space to ACL.
         */
        allowWrites: z.boolean(),
    }),
);
