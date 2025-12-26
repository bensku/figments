import { any } from '@bensku/y-query';
import { useQuery } from '@bensku/y-query-react';
import { useEffect, useMemo, useState } from 'react';
import type * as Y from 'yjs';
import { Modal } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs';
import { type Model, useInstance } from '@/context/instance';
import { useUser } from '@/context/user';
import { type Persona, PersonaTable } from '@/tables/persona';
import { deepEqual } from '@/utils/equal';
import type { PersonaSource } from './persona-card';
import { PersonaForm } from './persona-form';
import { PersonaList } from './persona-list';
import { usePersonaActions } from './use-persona-actions';

type ViewType = 'space' | 'user';
type EditorState =
    | { mode: 'list' }
    | { mode: 'view'; persona: Persona; source: PersonaSource }
    | { mode: 'create'; target: 'user' | 'space' }
    | { mode: 'edit'; persona: Persona; target: 'user' | 'space' };

const VIEW_TABS = [
    { id: 'space', label: 'Space' },
    { id: 'user', label: 'User' },
];

interface PersonaEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultView?: ViewType;
    spaceDoc?: Y.Doc;
}

export function PersonaEditorModal({
    isOpen,
    onClose,
    defaultView = 'space',
    spaceDoc,
}: PersonaEditorModalProps) {
    const { userDoc } = useUser();
    const { data: instance, loading: instanceLoading } = useInstance();

    const isReady = !instanceLoading && spaceDoc && userDoc;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Personas" size="lg">
            {isReady ? (
                <PersonaEditorContent
                    defaultView={defaultView}
                    isOpen={isOpen}
                    spaceDoc={spaceDoc}
                    userDoc={userDoc}
                    instancePersonas={instance?.personas ?? []}
                    models={instance?.models ?? []}
                />
            ) : (
                <div className="p-6 text-center text-gray-500">Loading...</div>
            )}
        </Modal>
    );
}

interface PersonaEditorContentProps {
    defaultView: ViewType;
    isOpen: boolean;
    spaceDoc: Y.Doc;
    userDoc: Y.Doc;
    instancePersonas: Persona[];
    models: Model[];
}

function PersonaEditorContent({
    defaultView,
    isOpen,
    spaceDoc,
    userDoc,
    instancePersonas,
    models,
}: PersonaEditorContentProps) {
    const [activeView, setActiveView] = useState<ViewType>(defaultView);
    const [editorState, setEditorState] = useState<EditorState>({
        mode: 'list',
    });

    // Reset to default view when modal opens
    useEffect(() => {
        if (isOpen) {
            setActiveView(defaultView);
            setEditorState({ mode: 'list' });
        }
    }, [isOpen, defaultView]);

    // Query personas from each source
    const spacePersonas = useQuery(
        spaceDoc,
        PersonaTable,
        () => any(),
        [],
        'content',
    );
    const userPersonas = useQuery(
        userDoc,
        PersonaTable,
        () => any(),
        [],
        'content',
    );

    // Compute which user personas are synced to space and which are outdated
    const { syncedUserPersonaKeys, outdatedUserPersonaKeys } = useMemo(() => {
        const spacePersonaMap = new Map(spacePersonas.map((p) => [p.key, p]));
        const synced = new Set<string>();
        const outdated = new Set<string>();

        for (const userPersona of userPersonas) {
            const spacePersona = spacePersonaMap.get(userPersona.key);
            if (spacePersona) {
                synced.add(userPersona.key);
                // Compare content (excluding importByDefault which is user-only)
                const { importByDefault: _u, ...userContent } = userPersona;
                const { importByDefault: _s, ...spaceContent } = spacePersona;
                if (!deepEqual(userContent, spaceContent)) {
                    outdated.add(userPersona.key);
                }
            }
        }

        return {
            syncedUserPersonaKeys: synced,
            outdatedUserPersonaKeys: outdated,
        };
    }, [spacePersonas, userPersonas]);

    const actions = usePersonaActions({ userDoc, spaceDoc });

    const handleTabChange = (tabId: string) => {
        setActiveView(tabId as ViewType);
        setEditorState({ mode: 'list' });
    };

    const handleView = (persona: Persona, source: PersonaSource) => {
        setEditorState({ mode: 'view', persona, source });
    };

    const handleEdit = (persona: Persona, target: 'user' | 'space') => {
        setEditorState({ mode: 'edit', persona, target });
    };

    const handleCreate = () => {
        const target = activeView === 'space' ? 'space' : 'user';
        setEditorState({ mode: 'create', target });
    };

    const handleDelete = (personaKey: string, source: 'user' | 'space') => {
        actions.deletePersonaAction(personaKey, source);
    };

    const handleClone = (persona: Persona) => {
        // In space view, clone to space; in user view, clone to user
        const target = activeView === 'space' ? 'space' : 'user';
        actions.clonePersona(persona, target);
    };

    const handleImport = (persona: Persona) => {
        actions.importPersona(persona);
    };

    const handleSave = (persona: Persona) => {
        if (editorState.mode === 'create') {
            actions.createPersona(persona, editorState.target);
        } else if (editorState.mode === 'edit') {
            actions.updatePersona(persona, editorState.target);
        }
        setEditorState({ mode: 'list' });
    };

    const handleCancel = () => {
        setEditorState({ mode: 'list' });
    };

    const renderContent = () => {
        switch (editorState.mode) {
            case 'view':
                return (
                    <div>
                        <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                aria-label="Back to list"
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <span className="text-sm font-medium text-gray-700">
                                View Persona
                            </span>
                        </div>
                        <PersonaForm
                            mode="view"
                            persona={editorState.persona}
                            models={models}
                            showImportByDefault={editorState.source === 'user'}
                        />
                    </div>
                );

            case 'create':
                return (
                    <div>
                        <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                aria-label="Back to list"
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <span className="text-sm font-medium text-gray-700">
                                Create{' '}
                                {editorState.target === 'user'
                                    ? 'User'
                                    : 'Space'}{' '}
                                Persona
                            </span>
                        </div>
                        <PersonaForm
                            mode="create"
                            models={models}
                            onSave={handleSave}
                            onCancel={handleCancel}
                            showImportByDefault={editorState.target === 'user'}
                        />
                    </div>
                );

            case 'edit':
                return (
                    <div>
                        <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                aria-label="Back to list"
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <span className="text-sm font-medium text-gray-700">
                                Edit Persona
                            </span>
                        </div>
                        <PersonaForm
                            mode="edit"
                            persona={editorState.persona}
                            models={models}
                            onSave={handleSave}
                            onCancel={handleCancel}
                            showImportByDefault={editorState.target === 'user'}
                        />
                    </div>
                );

            default:
                return (
                    <div>
                        <div className="px-4 pt-4 pb-2 flex justify-between items-center">
                            <Tabs
                                tabs={VIEW_TABS}
                                activeTab={activeView}
                                onTabChange={handleTabChange}
                            />
                            <button
                                type="button"
                                onClick={handleCreate}
                                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                                New
                            </button>
                        </div>
                        <PersonaList
                            view={activeView}
                            instancePersonas={instancePersonas}
                            userPersonas={userPersonas}
                            spacePersonas={spacePersonas}
                            syncedUserPersonaKeys={syncedUserPersonaKeys}
                            outdatedUserPersonaKeys={outdatedUserPersonaKeys}
                            onView={handleView}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onClone={handleClone}
                            onImport={handleImport}
                        />
                    </div>
                );
        }
    };

    return renderContent();
}
