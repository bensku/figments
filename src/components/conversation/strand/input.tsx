import { any, eq, type Row, update, upsert } from '@bensku/y-query';
import { useQuery, useRow } from '@bensku/y-query-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    sourceBadgeStyles,
    sourceLabels,
} from '@/components/settings/persona/constants';
import type { PersonaSource } from '@/components/settings/persona/persona-card';
import { useInstance } from '@/context/instance';
import { useSpaceDoc } from '@/context/space';
import { useUser } from '@/context/user';
import { useAutoExpandingTextarea } from '@/hooks/useAutoExpandingTextarea';
import { ChoiceTable, type NodeTable } from '@/tables/node';
import {
    type Persona,
    PersonaSelectionTable,
    PersonaTable,
} from '@/tables/persona';
import { UserSettingsTable } from '@/tables/user';
import { useSendMessage } from '../hooks/useSendMessage';

interface PersonaWithSource {
    persona: Persona;
    source: PersonaSource;
}

export function MessageInput({
    node,
    selectNode,
}: {
    node: Row<typeof NodeTable> | null;
    selectNode: (id: string | null) => void;
}) {
    const doc = useSpaceDoc();
    const [inputText, setInputText] = useState('');
    const {
        ref: textareaRef,
        adjustHeight,
        resetHeight,
    } = useAutoExpandingTextarea();

    // Get choices for the current node (if any)
    const choices = useQuery(
        doc,
        ChoiceTable,
        () => (node ? eq('node', node.key) : eq('node', '')),
        [node?.key],
        'content',
    );

    // Get all personas (instance + space + user) and user's selection
    const { data: instance } = useInstance();
    const { userDoc } = useUser();

    // Load user settings (with defaults)
    // Note: React hooks must be called unconditionally, so we query spaceDoc as
    // fallback when userDoc is null. The result is discarded in that case.
    const userSettingsQuery = useRow(
        userDoc ?? doc,
        UserSettingsTable,
        'settings',
        'content',
    );
    const userSettings = userDoc
        ? (userSettingsQuery ??
          UserSettingsTable.type.parse({ key: 'settings' }))
        : UserSettingsTable.type.parse({ key: 'settings' });
    const sendMessageOn = userSettings.sendMessageOn ?? 'ctrl+enter';
    const showReplySuggestions = userSettings.showReplySuggestions ?? true;

    const instancePersonas = instance?.personas ?? [];
    const spacePersonas = useQuery(
        doc,
        PersonaTable,
        () => any(),
        [],
        'content',
    );
    // Note: React hooks must be called unconditionally, so we query spaceDoc as
    // fallback when userDoc is null. The result is discarded in that case.
    // This is slightly wasteful but only happens briefly during initial load.
    const userPersonasQuery = useQuery(
        userDoc ?? doc,
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
        const instance = instancePersonas.map(
            (p): PersonaWithSource => ({ persona: p, source: 'instance' }),
        );

        return [...spaceOnly, ...userSynced, ...instance];
    }, [instancePersonas, spacePersonas, userPersonas]);

    const allPersonas = useMemo(
        () => allPersonasWithSource.map((p) => p.persona),
        [allPersonasWithSource],
    );
    const defaultPersonas = allPersonas[0] ? [allPersonas[0].key] : [];

    const personaSelection = useRow(
        doc,
        PersonaSelectionTable,
        'default-user',
        'content',
    );
    const enabledPersonas = personaSelection?.personaIds ?? defaultPersonas;

    const personas = allPersonas.filter((value) =>
        enabledPersonas.includes(value.key),
    );

    const sendReply = useSendMessage(doc, node, personas, selectNode);

    const handleSend = (text: string) => {
        const nodeKey = sendReply(text);
        if (nodeKey) {
            setInputText('');
            resetHeight();
        }
    };

    const selectChoice = (choice: Row<typeof ChoiceTable>) => {
        if (choice.takesTo) {
            selectNode(choice.takesTo);
        } else {
            const nodeId = sendReply(choice.value);
            update(doc, ChoiceTable, {
                key: choice.key,
                takesTo: nodeId,
            });
        }
    };

    const togglePersona = (id: string, enabled: boolean) => {
        const newPersonas = enabled
            ? [...enabledPersonas, id]
            : enabledPersonas.filter((p) => p !== id);
        upsert(doc, PersonaSelectionTable, {
            key: 'default-user',
            personaIds: newPersonas,
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter') {
            const isModified = e.ctrlKey || e.metaKey;
            const shouldSend =
                sendMessageOn === 'enter' ? !e.shiftKey : isModified;

            if (shouldSend) {
                e.preventDefault();
                if (personas.length > 0) {
                    handleSend(inputText);
                }
            }
        }
    };

    return (
        <div className="flex gap-3">
            {/* Draft-style container */}
            <div className="flex-1 py-3 px-3 rounded-lg border border-dashed border-gray-300 bg-gray-50/50">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        Draft
                    </span>
                    <span className="text-xs text-gray-400">→</span>
                    <PersonaSelector
                        allPersonasWithSource={allPersonasWithSource}
                        enabledPersonas={enabledPersonas}
                        personas={personas}
                        togglePersona={togglePersona}
                    />
                </div>

                {/* Choices */}
                {showReplySuggestions && choices.length > 0 && (
                    <ChoiceButtons
                        choices={choices}
                        selectChoice={selectChoice}
                    />
                )}

                {/* Textarea with integrated send button */}
                <div className="relative">
                    <textarea
                        ref={textareaRef}
                        value={inputText}
                        onChange={(e) => {
                            setInputText(e.target.value);
                            adjustHeight();
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            sendMessageOn === 'enter'
                                ? 'Type a message... (Enter to send)'
                                : 'Type a message... (Ctrl+Enter to send)'
                        }
                        className="w-full resize-none rounded-lg bg-gray-50 border-0 px-3 py-2 pr-10 text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:bg-white transition-colors"
                        rows={2}
                    />
                    <button
                        type="button"
                        onClick={() => handleSend(inputText)}
                        disabled={!inputText.trim() || personas.length === 0}
                        className="absolute right-2 bottom-2 p-1.5 rounded-md text-blue-500 hover:bg-blue-100 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
                        title={
                            sendMessageOn === 'enter'
                                ? 'Send (Enter)'
                                : 'Send (Ctrl+Enter)'
                        }
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

function PersonaSelector({
    allPersonasWithSource,
    enabledPersonas,
    personas,
    togglePersona,
}: {
    allPersonasWithSource: PersonaWithSource[];
    enabledPersonas: string[];
    personas: Persona[];
    togglePersona: (id: string, enabled: boolean) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [openUpward, setOpenUpward] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const dropdownHeight = 200; // Approximate max height of dropdown
            setOpenUpward(spaceBelow < dropdownHeight);
        }
    }, [isOpen]);

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
                <span>
                    {personas.length === 0
                        ? 'None'
                        : personas.length === 1
                          ? personas[0]?.title || personas[0]?.key
                          : `${personas.length} personas`}
                </span>
                <svg
                    className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </button>

            {isOpen && (
                <>
                    {/* biome-ignore lint/a11y/noStaticElementInteractions: Backdrop for click-outside */}
                    <div
                        className="fixed inset-0 z-0"
                        onClick={() => setIsOpen(false)}
                        onKeyDown={() => {}}
                        role="presentation"
                    />
                    <div
                        className={`absolute left-0 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 ${
                            openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
                        }`}
                    >
                        {allPersonasWithSource.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500">
                                No personas available
                            </div>
                        ) : (
                            allPersonasWithSource.map(({ persona, source }) => {
                                const isEnabled = enabledPersonas.includes(
                                    persona.key,
                                );
                                return (
                                    <button
                                        key={persona.key}
                                        type="button"
                                        onClick={() =>
                                            togglePersona(
                                                persona.key,
                                                !isEnabled,
                                            )
                                        }
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isEnabled}
                                            onChange={() => {}}
                                            className="rounded border-gray-300"
                                        />
                                        <span className="font-medium truncate">
                                            {persona.title || persona.key}
                                        </span>
                                        <span
                                            className={`ml-auto px-1.5 py-0.5 text-xs font-medium rounded-full ${sourceBadgeStyles[source]}`}
                                        >
                                            {sourceLabels[source]}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function ChoiceButtons({
    choices,
    selectChoice,
}: {
    choices: Row<typeof ChoiceTable>[];
    selectChoice: (choice: Row<typeof ChoiceTable>) => void;
}) {
    return (
        <div className="mb-3 space-y-1">
            {choices.map((choice, index) => {
                const isTaken = !!choice.takesTo;
                return (
                    <button
                        key={choice.key}
                        type="button"
                        onClick={() => selectChoice(choice)}
                        className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors ${
                            isTaken
                                ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                    >
                        <span className="font-medium mr-2">{index + 1}.</span>
                        {truncateText(choice.value, 60)}
                        {isTaken && (
                            <span className="ml-2 text-xs text-gray-400">
                                (visited)
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1)}…`;
}
