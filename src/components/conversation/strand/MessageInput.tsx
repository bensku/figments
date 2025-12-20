import { any, eq, getKey, type Row, update, upsert } from '@bensku/y-query';
import { useQuery, useRow } from '@bensku/y-query-react';
import { useRef, useState } from 'react';
import * as Y from 'yjs';
import { useSpace } from '@/components/space';
import { ChoiceTable, FragmentTable, NodeTable } from '@/tables/node';
import { PersonaSelectionTable, PersonaTable } from '@/tables/persona';

export function MessageInput({
    node,
    selectNode,
}: {
    node: Row<typeof NodeTable> | null;
    selectNode: (id: string | null) => void;
}) {
    const doc = useSpace();
    const [inputText, setInputText] = useState('');
    const [isPersonaDropdownOpen, setIsPersonaDropdownOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustTextareaHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    };

    // Get choices for the current node (if any)
    const choices = useQuery(
        doc,
        ChoiceTable,
        () => (node ? eq('node', node.key) : eq('node', '')),
        [node?.key],
        'content',
    );

    // Get all personas and user's selection
    const allPersonas = useQuery(doc, PersonaTable, () => any(), [], 'content');
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

    const sendReply = (text: string) => {
        if (!text.trim()) return;

        // For empty conversation, create root node
        const parentId = node?.key ?? 'root';

        // Submit user message
        const nodeKey = crypto.randomUUID();
        upsert(doc, NodeTable, {
            key: nodeKey,
            parentId,
            role: 'user',
            createdAt: Date.now(),
            author: '', // Not used for user nodes
            summary: text, // For now, assume user messages will probably be short
            completed: true,
        });
        const fragmentKey = crypto.randomUUID();
        upsert(doc, FragmentTable, {
            key: fragmentKey,
            node: nodeKey,
            role: 'main',
            createdAt: Date.now(),
            data: {
                type: 'text',
                text: new Y.Text(),
            },
        });
        const userFragment = getKey(doc, FragmentTable, fragmentKey);
        if (userFragment?.data.type === 'text') {
            userFragment.data.text.insert(0, text);
        }

        // Request LLM nodes to be generated as replies for it
        let nodeToSelect = nodeKey;
        for (const persona of personas) {
            const replyKey = crypto.randomUUID();
            upsert(doc, NodeTable, {
                key: replyKey,
                parentId: nodeKey,
                role: 'llm',
                createdAt: Date.now(),
                author: persona.key,
                summary: '', // To be filled later by backend
                completed: false,
            });
            // If there is only one persona replying, immediately jump to it
            if (personas.length === 1) {
                nodeToSelect = replyKey;
            }
        }

        // Select the newly created user node
        selectNode(nodeToSelect);
        setInputText('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        // Return user node's key so that selectChoice can mark it
        return nodeKey;
    };

    const selectChoice = (choice: Row<typeof ChoiceTable>) => {
        if (choice.takesTo) {
            // Choice has been taken before, select that user node
            selectNode(choice.takesTo);
        } else {
            // We'll need to create user node and trigger LLMs on it
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
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            sendReply(inputText);
        }
    };

    return (
        <div className="flex gap-3">
            {/* Draft-style container */}
            <div className="flex-1 py-3 px-3 rounded-lg border border-dashed border-gray-300 bg-gray-50/50">
                {/* Header matching StrandNode style */}
                <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        Draft
                    </span>

                    {/* Persona selector inline */}
                    <span className="text-xs text-gray-400">→</span>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() =>
                                setIsPersonaDropdownOpen(!isPersonaDropdownOpen)
                            }
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
                                className={`w-3 h-3 transition-transform ${isPersonaDropdownOpen ? 'rotate-180' : ''}`}
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

                        {isPersonaDropdownOpen && (
                            <>
                                {/* Backdrop to close dropdown on outside click */}
                                {/* biome-ignore lint/a11y/noStaticElementInteractions: Backdrop intentionally uses div for click-outside behavior */}
                                <div
                                    className="fixed inset-0 z-0"
                                    onClick={() =>
                                        setIsPersonaDropdownOpen(false)
                                    }
                                    onKeyDown={() => {}}
                                    role="presentation"
                                />
                                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                    {allPersonas.length === 0 ? (
                                        <div className="px-3 py-2 text-sm text-gray-500">
                                            No personas available
                                        </div>
                                    ) : (
                                        allPersonas.map((persona) => {
                                            const isEnabled =
                                                enabledPersonas.includes(
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
                                                    <span className="font-medium">
                                                        {persona.title ||
                                                            persona.key}
                                                    </span>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Suggested replies */}
                {choices.length > 0 && (
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
                                    <span className="font-medium mr-2">
                                        {index + 1}.
                                    </span>
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
                )}

                {/* Textarea with integrated send button */}
                <div className="relative">
                    <textarea
                        ref={textareaRef}
                        value={inputText}
                        onChange={(e) => {
                            setInputText(e.target.value);
                            adjustTextareaHeight();
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message... (Ctrl+Enter to send)"
                        className="w-full resize-none rounded-lg bg-gray-50 border-0 px-3 py-2 pr-10 text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:bg-white transition-colors"
                        rows={2}
                    />
                    <button
                        type="button"
                        onClick={() => sendReply(inputText)}
                        disabled={!inputText.trim()}
                        className="absolute right-2 bottom-2 p-1.5 rounded-md text-blue-500 hover:bg-blue-100 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
                        title="Send (Ctrl+Enter)"
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

function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1)}…`;
}
