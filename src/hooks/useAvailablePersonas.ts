import { any } from '@bensku/y-query';
import { useQuery, useRow } from '@bensku/y-query-react';
import { useMemo } from 'react';
import type * as Y from 'yjs';
import type { PersonaSource } from '@/components/settings/persona/persona-card';
import { useOptionalInstance } from '@/context/instance';
import { useOptionalUser } from '@/context/user';
import {
    type Persona,
    PersonaSelectionTable,
    PersonaTable,
} from '@/tables/persona';

export interface PersonaWithSource {
    persona: Persona;
    source: PersonaSource;
}

/**
 * Hook to get all available personas from instance, space, and user sources.
 * Also returns the currently enabled personas based on user selection.
 */
export function useAvailablePersonas(spaceDoc: Y.Doc) {
    const instancePersonas = useOptionalInstance()?.data?.personas ?? [];
    const userContext = useOptionalUser();
    const userDoc = userContext?.userDoc ?? null;
    const spacePersonas = useQuery(
        spaceDoc,
        PersonaTable,
        () => any(),
        [],
        'content',
    );

    // Note: React hooks must be called unconditionally, so we query spaceDoc as
    // fallback when userDoc is null. The result is discarded in that case.
    // This is slightly wasteful but only happens briefly during initial load.
    const userPersonasQuery = useQuery(
        userDoc ?? spaceDoc,
        PersonaTable,
        () => any(),
        [],
        'content',
    );
    const userPersonas = userDoc ? userPersonasQuery : [];

    // Build ordered list with sources (same order as editor modal, sorted alphabetically within categories)
    const allPersonasWithSource = useMemo(() => {
        const spacePersonaKeys = new Set(spacePersonas.map((p) => p.key));
        const sortByTitle = (a: Persona, b: Persona) =>
            a.title.localeCompare(b.title);

        // 1. Space personas (excluding those synced from user), sorted alphabetically
        const spaceOnly = spacePersonas
            .filter((p) => !userPersonas.find((up) => up.key === p.key))
            .sort(sortByTitle)
            .map((p): PersonaWithSource => ({ persona: p, source: 'space' }));

        // 2. User personas synced to space, sorted alphabetically
        const userSynced = userPersonas
            .filter((p) => spacePersonaKeys.has(p.key))
            .sort(sortByTitle)
            .map((p): PersonaWithSource => ({ persona: p, source: 'user' }));

        // 3. Instance personas (keep original order)
        const instanceList = instancePersonas.map(
            (p): PersonaWithSource => ({ persona: p, source: 'instance' }),
        );

        return [...spaceOnly, ...userSynced, ...instanceList];
    }, [instancePersonas, spacePersonas, userPersonas]);

    const allPersonas = useMemo(
        () => allPersonasWithSource.map((p) => p.persona),
        [allPersonasWithSource],
    );

    const defaultPersonas = allPersonas[0] ? [allPersonas[0].key] : [];

    const personaSelection = useRow(
        spaceDoc,
        PersonaSelectionTable,
        'default-user',
        'content',
    );
    const enabledPersonaIds = personaSelection?.personaIds ?? defaultPersonas;

    const enabledPersonas = allPersonas.filter((value) =>
        enabledPersonaIds.includes(value.key),
    );

    return {
        /** All personas with their source information */
        allPersonasWithSource,
        /** All personas (flat list) */
        allPersonas,
        /** IDs of currently enabled personas */
        enabledPersonaIds,
        /** Currently enabled personas */
        enabledPersonas,
    };
}
