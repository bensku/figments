import { getKey } from '@bensku/y-query';
import type * as Y from 'yjs';
import { CONFIG } from '@/config';
import { type Persona, PersonaTable } from '@/tables/persona';

const INSTANCE_PERSONAS = new Map();
for (const persona of CONFIG.personas) {
    INSTANCE_PERSONAS.set(persona.key, persona);
}

export function getPersona(doc: Y.Doc, personaId: string): Persona | null {
    const persona = INSTANCE_PERSONAS.get(personaId);
    if (persona) {
        return persona;
    }
    return getKey(doc, PersonaTable, personaId);
}
