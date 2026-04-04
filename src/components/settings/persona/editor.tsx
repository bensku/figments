import { any } from '@bensku/y-query';
import { useQuery } from '@bensku/y-query-react';
import { useEffect, useMemo, useState } from 'react';
import type * as Y from 'yjs';
import { Tabs } from '@/components/ui/tabs';
import type { Model } from '@/context/instance';
import type { ToolMeta } from '@/llm/tool/types';
import { type Persona, PersonaTable } from '@/tables/persona';
import { deepEqual } from '@/utils/equal';
import { PersonaForm } from './editor-form';
import { EditorHeader } from './editor-header';
import { usePersonaActions } from './hooks';
import type { PersonaSource } from './persona-card';
import { PersonaList } from './persona-list';
import { SPACING } from './styles';

type ViewType = 'space' | 'user';
type EditorState =
    | { mode: 'list' }
    | { mode: 'view'; persona: Persona; source: PersonaSource }
    | { mode: 'create'; target: 'user' | 'space' }
    | { mode: 'edit'; persona: Persona; target: 'user' | 'space' };

export interface PersonaEditorProps {
    activeView: ViewType;
    onViewChange: (view: ViewType) => void;
    personaType?: 'preset' | 'agent';
    isOpen: boolean;
    spaceDoc: Y.Doc | null;
    userDoc: Y.Doc;
    instancePersonas: Persona[];
    models: Model[];
    tools: ToolMeta[];
}

export function PersonaEditor({
    activeView,
    onViewChange,
    personaType = 'preset',
    isOpen,
    spaceDoc,
    userDoc,
    instancePersonas,
    models,
    tools,
}: PersonaEditorProps) {
    const hasSpace = !!spaceDoc;

    const [editorState, setEditorState] = useState<EditorState>({
        mode: 'list',
    });

    // Build tabs based on whether space is available
    const viewTabs = useMemo(
        () =>
            hasSpace
                ? [
                      { id: 'space', label: 'Space' },
                      { id: 'user', label: 'User' },
                  ]
                : [{ id: 'user', label: 'User' }],
        [hasSpace],
    );

    // Reset editor state when modal opens
    useEffect(() => {
        if (isOpen) {
            setEditorState({ mode: 'list' });
        }
    }, [isOpen]);

    // Query personas from each source
    // Note: React hooks must be called unconditionally, so we query userDoc as
    // fallback when spaceDoc is null. The result is discarded in that case.
    const spacePersonasQuery = useQuery(
        spaceDoc ?? userDoc,
        PersonaTable,
        () => any(),
        [],
        'content',
    );
    const spacePersonas = spaceDoc ? spacePersonasQuery : [];

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

    // Collect all agent personas for the agent picker (used when editing presets)
    const availableAgents = useMemo(() => {
        const byKey = new Map<string, Persona>();
        for (const p of instancePersonas) {
            if ((p.type ?? 'preset') === 'agent') byKey.set(p.key, p);
        }
        for (const p of spacePersonas) {
            if ((p.type ?? 'preset') === 'agent') byKey.set(p.key, p);
        }
        for (const p of userPersonas) {
            if ((p.type ?? 'preset') === 'agent') byKey.set(p.key, p);
        }
        return [...byKey.values()];
    }, [instancePersonas, spacePersonas, userPersonas]);

    const typeLabel = personaType === 'agent' ? 'Agent' : 'Preset';

    const actions = usePersonaActions({ userDoc, spaceDoc });

    const handleTabChange = (tabId: string) => {
        onViewChange(tabId as ViewType);
        setEditorState({ mode: 'list' });
    };

    const handleView = (persona: Persona, source: PersonaSource) => {
        setEditorState({ mode: 'view', persona, source });
    };

    const handleEdit = (persona: Persona, target: 'user' | 'space') => {
        setEditorState({ mode: 'edit', persona, target });
    };

    const handleCreate = () => {
        // Only create in space if space is available and in space view
        const target = activeView === 'space' && hasSpace ? 'space' : 'user';
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
                    <div className="flex flex-col h-full w-full">
                        <EditorHeader
                            title={`View ${typeLabel}`}
                            onBack={handleCancel}
                        />
                        <PersonaForm
                            mode="view"
                            personaType={editorState.persona.type ?? 'preset'}
                            persona={editorState.persona}
                            models={models}
                            tools={tools}
                            availableAgents={availableAgents}
                            showImportByDefault={editorState.source === 'user'}
                        />
                    </div>
                );

            case 'create':
                return (
                    <div className="flex flex-col h-full w-full">
                        <EditorHeader
                            title={`Create ${editorState.target === 'user' ? 'User' : 'Space'} ${typeLabel}`}
                            onBack={handleCancel}
                        />
                        <PersonaForm
                            mode="create"
                            personaType={personaType}
                            models={models}
                            tools={tools}
                            availableAgents={availableAgents}
                            onSave={handleSave}
                            onCancel={handleCancel}
                            showImportByDefault={editorState.target === 'user'}
                        />
                    </div>
                );

            case 'edit':
                return (
                    <div className="flex flex-col h-full w-full">
                        <EditorHeader
                            title={`Edit ${typeLabel}`}
                            onBack={handleCancel}
                        />
                        <PersonaForm
                            mode="edit"
                            personaType={editorState.persona.type ?? 'preset'}
                            persona={editorState.persona}
                            models={models}
                            tools={tools}
                            availableAgents={availableAgents}
                            onSave={handleSave}
                            onCancel={handleCancel}
                            showImportByDefault={editorState.target === 'user'}
                        />
                    </div>
                );

            default:
                return (
                    <div className="flex flex-col h-full w-full">
                        <div
                            className={`${SPACING.LIST_HEADER} flex justify-between items-center`}
                        >
                            <Tabs
                                tabs={viewTabs}
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
                        <div className="flex-1 overflow-y-auto overflow-x-hidden">
                            <PersonaList
                                view={activeView}
                                personaType={personaType}
                                instancePersonas={instancePersonas}
                                userPersonas={userPersonas}
                                spacePersonas={spacePersonas}
                                syncedUserPersonaKeys={syncedUserPersonaKeys}
                                outdatedUserPersonaKeys={
                                    outdatedUserPersonaKeys
                                }
                                hasSpace={hasSpace}
                                onView={handleView}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onClone={handleClone}
                                onImport={handleImport}
                            />
                        </div>
                    </div>
                );
        }
    };

    return renderContent();
}
