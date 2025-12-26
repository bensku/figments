import { upsert } from '@bensku/y-query';
import { useCallback } from 'react';
import type * as Y from 'yjs';
import {
    deletePersona,
    importUserPersonas,
    type Persona,
    PersonaTable,
} from '@/tables/persona';

type PersonaTarget = 'user' | 'space';

interface UsePersonaActionsProps {
    userDoc: Y.Doc | null;
    spaceDoc?: Y.Doc;
}

interface PersonaActions {
    /** Whether the required docs are available for actions to work */
    isReady: boolean;
    createPersona: (persona: Persona, target: PersonaTarget) => void;
    updatePersona: (persona: Persona, target: PersonaTarget) => void;
    deletePersonaAction: (personaKey: string, source: PersonaTarget) => void;
    clonePersona: (persona: Persona, target: PersonaTarget) => void;
    importPersona: (persona: Persona) => void;
}

export function usePersonaActions({
    userDoc,
    spaceDoc,
}: UsePersonaActionsProps): PersonaActions {
    // Helper to get doc for a target, returns null if not available
    const getDoc = useCallback(
        (target: PersonaTarget): Y.Doc | null => {
            if (target === 'user') {
                return userDoc ?? null;
            }
            return spaceDoc ?? null;
        },
        [userDoc, spaceDoc],
    );

    const createPersona = useCallback(
        (persona: Persona, target: PersonaTarget) => {
            const doc = getDoc(target);
            if (!doc) return;

            upsert(doc, PersonaTable, persona);

            // If creating a user persona and space is available, sync to space
            if (target === 'user' && userDoc && spaceDoc) {
                importUserPersonas(userDoc, spaceDoc);
            }
        },
        [getDoc, userDoc, spaceDoc],
    );

    const updatePersona = useCallback(
        (persona: Persona, target: PersonaTarget) => {
            const doc = getDoc(target);
            if (!doc) return;

            upsert(doc, PersonaTable, persona);

            // If updating a user persona and space is available, sync to space
            if (target === 'user' && userDoc && spaceDoc) {
                importUserPersonas(userDoc, spaceDoc);
            }
        },
        [getDoc, userDoc, spaceDoc],
    );

    const deletePersonaAction = useCallback(
        (personaKey: string, source: PersonaTarget) => {
            const doc = getDoc(source);
            if (!doc) return;

            deletePersona(doc, personaKey);
        },
        [getDoc],
    );

    const clonePersona = useCallback(
        (persona: Persona, target: PersonaTarget) => {
            const doc = getDoc(target);
            if (!doc) return;

            const clonedPersona: Persona = {
                ...persona,
                key: crypto.randomUUID(),
                title: `${persona.title} (copy)`,
                // Remove importByDefault when cloning to space
                importByDefault:
                    target === 'user' ? persona.importByDefault : undefined,
            };
            upsert(doc, PersonaTable, clonedPersona);
        },
        [getDoc],
    );

    const importPersona = useCallback(
        (persona: Persona) => {
            if (!spaceDoc) return;

            // Import preserves the key (unlike clone)
            const importedPersona: Persona = {
                ...persona,
                // Remove importByDefault flag when importing to space
                importByDefault: undefined,
            };
            upsert(spaceDoc, PersonaTable, importedPersona);
        },
        [spaceDoc],
    );

    return {
        isReady: !!userDoc && !!spaceDoc,
        createPersona,
        updatePersona,
        deletePersonaAction,
        clonePersona,
        importPersona,
    };
}
