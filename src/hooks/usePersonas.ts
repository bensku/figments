import { any } from '@bensku/y-query';
import { useQuery } from '@bensku/y-query-react';
import { useMemo } from 'react';
import { useSpace } from '@/components/space';
import { useInstance } from '@/context/instance';
import { type Persona, PersonaTable } from '@/tables/persona';

/**
 * Returns all available personas, combining instance-level and space-level personas.
 * Instance personas override space personas with the same key.
 */
export function usePersonas(): Persona[] {
    const doc = useSpace();
    const { data: instance } = useInstance();
    const instancePersonas = instance?.personas ?? [];
    const spacePersonas = useQuery(
        doc,
        PersonaTable,
        () => any(),
        [],
        'content',
    );

    return useMemo(() => {
        const byKey = new Map<string, Persona>();
        for (const p of spacePersonas) byKey.set(p.key, p);
        for (const p of instancePersonas) byKey.set(p.key, p);
        return [...byKey.values()];
    }, [instancePersonas, spacePersonas]);
}

/**
 * Returns a single persona by ID, looking up from both instance and space personas.
 */
export function usePersona(personaId: string | undefined): Persona | undefined {
    const personas = usePersonas();
    return useMemo(
        () => personas.find((p) => p.key === personaId),
        [personas, personaId],
    );
}
