import {
    eq,
    getKey,
    type Row,
    remove,
    select,
    table,
    upsert,
} from '@bensku/y-query';
import type * as Y from 'yjs';
import z from 'zod';
import { PersonaConfig } from '@/config/schema';
import { deepEqual } from '@/utils/equal';

/**
 * Persona is a configuration set for an LLM. This table contains user-defined
 * personas; they can also be configured in figments.toml on instance level.
 *
 * This table can be found on both user and space documents. Space personas are
 * what get actually used. User personas are imported on space creation
 * (if this is enabled) or can be imported manually by user.
 */
export const PersonaTable = table('personas', PersonaConfig);

/**
 * Enabled personas for users within a space.
 */
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

/**
 * Syncs user personas with importByDefault flag set to a space.
 * Also imports any agents referenced by those presets.
 * @param userDb
 * @param spaceDb
 */
export function importUserPersonas(userDb: Y.Doc, spaceDb: Y.Doc) {
    const personas = select(userDb, PersonaTable, eq('importByDefault', true));
    for (const persona of personas) {
        // Avoid upserting if nothing has changed, it may still increase Yjs Doc size
        const targetPersona = getKey(spaceDb, PersonaTable, persona.key);
        if (!deepEqual(persona, targetPersona)) {
            upsert(spaceDb, PersonaTable, persona);
        }
        importReferencedAgents(userDb, spaceDb, persona);
    }
}

/**
 * Imports agents referenced by a persona from the user doc to the space doc.
 * This ensures presets work correctly even if their agents don't have
 * importByDefault set.
 */
export function importReferencedAgents(
    userDb: Y.Doc,
    spaceDb: Y.Doc,
    persona: Persona,
) {
    for (const agentKey of persona.agents) {
        const agent = getKey(userDb, PersonaTable, agentKey);
        if (!agent) continue;
        const existing = getKey(spaceDb, PersonaTable, agentKey);
        if (!deepEqual(agent, existing)) {
            upsert(spaceDb, PersonaTable, agent);
        }
    }
}

/**
 * Deletes a persona from a document (user or space).
 * @param doc Database to operate on.
 * @param personaKey Key of the persona to delete.
 */
export function deletePersona(doc: Y.Doc, personaKey: string) {
    remove(doc, PersonaTable, personaKey);
}
