import type { Persona } from '@/tables/persona';
import { PersonaCard, type PersonaSource } from './persona-card';

type ViewType = 'space' | 'user';

const sortByTitle = (a: Persona, b: Persona) => a.title.localeCompare(b.title);

interface PersonaListProps {
    view: ViewType;
    instancePersonas: Persona[];
    userPersonas: Persona[];
    spacePersonas?: Persona[];
    syncedUserPersonaKeys?: Set<string>;
    outdatedUserPersonaKeys?: Set<string>;
    /** Whether a space is available for importing personas to */
    hasSpace?: boolean;
    onView: (persona: Persona, source: PersonaSource) => void;
    onEdit: (persona: Persona, source: 'user' | 'space') => void;
    onDelete: (personaKey: string, source: 'user' | 'space') => void;
    onClone: (persona: Persona) => void;
    onImport: (persona: Persona) => void;
}

export function PersonaList({
    view,
    instancePersonas,
    userPersonas,
    spacePersonas = [],
    syncedUserPersonaKeys = new Set(),
    outdatedUserPersonaKeys = new Set(),
    hasSpace = true,
    onView,
    onEdit,
    onDelete,
    onClone,
    onImport,
}: PersonaListProps) {
    // View-aware empty check
    const isSpaceViewEmpty =
        spacePersonas.length === 0 &&
        userPersonas.filter((p) => syncedUserPersonaKeys.has(p.key)).length ===
            0 &&
        instancePersonas.length === 0;

    const isUserViewEmpty =
        userPersonas.length === 0 && instancePersonas.length === 0;

    const isEmpty = view === 'space' ? isSpaceViewEmpty : isUserViewEmpty;

    if (isEmpty) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mb-4 text-gray-300"
                    aria-hidden="true"
                >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
                <p className="text-sm">
                    {view === 'space'
                        ? 'No personas in this space'
                        : 'No user personas yet'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    Create a new persona to get started
                </p>
            </div>
        );
    }

    if (view === 'space') {
        return (
            <div className="space-y-2 p-4">
                {spacePersonas
                    .filter(
                        (persona) => !syncedUserPersonaKeys.has(persona.key),
                    )
                    .sort(sortByTitle)
                    .map((persona) => (
                        <PersonaCard
                            key={persona.key}
                            persona={persona}
                            source="space"
                            onEdit={() => onEdit(persona, 'space')}
                            onDelete={() => onDelete(persona.key, 'space')}
                            onClone={() => onClone(persona)}
                        />
                    ))}
                {userPersonas
                    .filter((persona) => syncedUserPersonaKeys.has(persona.key))
                    .sort(sortByTitle)
                    .map((persona) => {
                        const isOutdated = outdatedUserPersonaKeys.has(
                            persona.key,
                        );
                        // Show import if outdated and no auto-sync
                        const canImport =
                            isOutdated && !persona.importByDefault;
                        // Allow unlinking if no auto-sync
                        const canUnlink = !persona.importByDefault;
                        return (
                            <PersonaCard
                                key={persona.key}
                                persona={persona}
                                source="user"
                                onEdit={() => onEdit(persona, 'user')}
                                onClone={() => onClone(persona)}
                                onImport={() => onImport(persona)}
                                onDelete={
                                    canUnlink
                                        ? () => onDelete(persona.key, 'space')
                                        : undefined
                                }
                                isSyncedToSpace
                                isOutdated={isOutdated}
                                canImport={canImport}
                            />
                        );
                    })}
                {instancePersonas.map((persona) => (
                    <PersonaCard
                        key={persona.key}
                        persona={persona}
                        source="instance"
                        onEdit={() => onView(persona, 'instance')}
                        onClone={() => onClone(persona)}
                    />
                ))}
            </div>
        );
    }

    // User view
    return (
        <div className="space-y-2 p-4">
            {[...userPersonas].sort(sortByTitle).map((persona) => {
                const isSynced = syncedUserPersonaKeys.has(persona.key);
                const isOutdated = outdatedUserPersonaKeys.has(persona.key);
                // Show import if space available and (not synced, or outdated without auto-sync)
                const canImport =
                    hasSpace &&
                    (!isSynced || (isOutdated && !persona.importByDefault));
                return (
                    <PersonaCard
                        key={persona.key}
                        persona={persona}
                        source="user"
                        onEdit={() => onEdit(persona, 'user')}
                        onDelete={() => onDelete(persona.key, 'user')}
                        onClone={() => onClone(persona)}
                        onImport={() => onImport(persona)}
                        isSyncedToSpace={hasSpace && isSynced}
                        isOutdated={isOutdated}
                        canImport={canImport}
                    />
                );
            })}
            {instancePersonas.map((persona) => (
                <PersonaCard
                    key={persona.key}
                    persona={persona}
                    source="instance"
                    onEdit={() => onView(persona, 'instance')}
                    onClone={() => onClone(persona)}
                />
            ))}
        </div>
    );
}
