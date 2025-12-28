import { table } from '@bensku/y-query';
import z from 'zod';

/**
 * Spaces of a particular user.
 */
export const SpaceTable = table(
    'spaces',
    z.object({
        key: z.string(),

        /**
         * The id we'll use to lookup space's Y.Doc.
         */
        spaceId: z.string(),

        /**
         * Title of space to show on UI.
         */
        title: z.string(),
    }),
);

/**
 * Table with one row that contains user's personal settings.
 */
export const UserSettingsTable = table(
    'settings',
    z.object({
        key: z.literal('settings'),

        /**
         * Whether or not to show reply suggestions (internally known as choices).
         */
        showReplySuggestions: z.boolean().default(true).optional(),

        /**
         * When typing message, by default Enter adds a new line, while
         * Ctrl+Enter sends. User can change Enter to send, in which case
         * Shift+Enter is used to type new lines.
         */
        sendMessageOn: z
            .enum(['enter', 'ctrl+enter'])
            .default('ctrl+enter')
            .optional(),
    }),
);
