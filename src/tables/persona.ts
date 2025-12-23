import { type Row, table } from '@bensku/y-query';
import z from 'zod';
import { PersonaConfig } from '@/config/schema';

export const PersonaTable = table('personas', PersonaConfig);

export const PersonaSelectionTable = table(
    'selectedPersonas',
    z.object({
        /**
         * User id.
         */
        key: z.string(),

        /**
         * Ids of personas that have been enabled.
         */
        personaIds: z.array(z.string()),
    }),
);

export type Persona = Row<typeof PersonaTable>;
