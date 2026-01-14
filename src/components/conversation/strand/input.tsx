import { any, eq, type Row, update, upsert } from '@bensku/y-query';
import { useQuery, useRow } from '@bensku/y-query-react';
import {
    ChevronDown,
    File as FileIcon,
    Paperclip,
    Send,
    X,
} from 'lucide-react';
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
import { type FileAttachment, useSendMessage } from '../hooks/useSendMessage';

async function uploadFile(file: File): Promise<{ id: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/attachment/upload', {
        method: 'POST',
        body: formData,
    });
    return response.json();
}

interface PendingFile {
    file: File;
    id?: string;
    uploading: boolean;
    error?: string;
}

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
    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
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

    const addFiles = (files: FileList | File[]) => {
        const newFiles: PendingFile[] = Array.from(files).map((file) => ({
            file,
            uploading: true,
        }));
        setPendingFiles((prev) => [...prev, ...newFiles]);

        // Upload each file
        for (const pendingFile of newFiles) {
            uploadFile(pendingFile.file)
                .then((result) => {
                    setPendingFiles((prev) =>
                        prev.map((f) =>
                            f.file === pendingFile.file
                                ? { ...f, id: result.id, uploading: false }
                                : f,
                        ),
                    );
                })
                .catch(() => {
                    setPendingFiles((prev) =>
                        prev.map((f) =>
                            f.file === pendingFile.file
                                ? {
                                      ...f,
                                      uploading: false,
                                      error: 'Upload failed',
                                  }
                                : f,
                        ),
                    );
                });
        }
    };

    const removeFile = (file: File) => {
        setPendingFiles((prev) => prev.filter((f) => f.file !== file));
    };

    const handleSend = async (text: string) => {
        // Wait for all uploads to complete
        const stillUploading = pendingFiles.some((f) => f.uploading);
        if (stillUploading) return;

        const files: FileAttachment[] = pendingFiles
            .filter(
                (f): f is PendingFile & { id: string } => !!f.id && !f.error,
            )
            .map((f) => ({
                id: f.id,
                mediaType: f.file.type || 'application/octet-stream',
                filename: f.file.name,
            }));

        const nodeKey = sendReply(text, files.length > 0 ? files : undefined);
        if (nodeKey) {
            setInputText('');
            setPendingFiles([]);
            resetHeight();
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) {
            addFiles(e.dataTransfer.files);
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

    const hasContent = inputText.trim() || pendingFiles.length > 0;
    const canSend =
        hasContent &&
        personas.length > 0 &&
        !pendingFiles.some((f) => f.uploading);

    return (
        <div className="flex gap-3">
            {/* Draft-style container */}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: Drop zone for file uploads */}
            <div
                className={`flex-1 min-w-0 py-3 px-3 rounded-lg border border-dashed transition-colors ${
                    isDragging
                        ? 'border-blue-400 bg-blue-50/50'
                        : 'border-gray-300 bg-gray-50/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
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

                {/* Pending file previews */}
                {pendingFiles.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                        {pendingFiles.map((pf, index) => (
                            <div
                                key={`${pf.file.name}-${index}`}
                                className={`relative group flex items-center gap-2 px-2 py-1 rounded-md text-xs ${
                                    pf.error
                                        ? 'bg-red-100 text-red-700'
                                        : pf.uploading
                                          ? 'bg-gray-200 text-gray-500'
                                          : 'bg-blue-100 text-blue-700'
                                }`}
                            >
                                {pf.file.type.startsWith('image/') ? (
                                    <img
                                        src={URL.createObjectURL(pf.file)}
                                        alt={pf.file.name}
                                        className="w-6 h-6 object-cover rounded"
                                    />
                                ) : (
                                    <FileIcon
                                        className="w-4 h-4"
                                        aria-hidden="true"
                                    />
                                )}
                                <span className="max-w-[100px] truncate">
                                    {pf.file.name}
                                </span>
                                {pf.uploading && (
                                    <span className="animate-pulse">...</span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => removeFile(pf.file)}
                                    className="ml-1 p-0.5 rounded hover:bg-black/10"
                                    title="Remove"
                                >
                                    <X className="w-3 h-3" aria-hidden="true" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Textarea with integrated buttons */}
                <div className="relative">
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files) {
                                addFiles(e.target.files);
                                e.target.value = '';
                            }
                        }}
                    />
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
                        className="w-full resize-none rounded-lg bg-gray-50 border-0 px-3 py-2 pr-20 text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 focus:bg-white transition-colors"
                        rows={2}
                    />
                    <div className="absolute right-2 bottom-2 flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                            title="Attach file"
                        >
                            <Paperclip className="w-5 h-5" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSend(inputText)}
                            disabled={!canSend}
                            className="p-1.5 rounded-md text-blue-500 hover:bg-blue-100 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
                            title={
                                sendMessageOn === 'enter'
                                    ? 'Send (Enter)'
                                    : 'Send (Ctrl+Enter)'
                            }
                        >
                            <Send className="w-5 h-5" aria-hidden="true" />
                        </button>
                    </div>
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
                <ChevronDown
                    className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                />
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
                        className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center overflow-hidden ${
                            isTaken
                                ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                    >
                        <span className="font-medium mr-2 flex-shrink-0">
                            {index + 1}.
                        </span>
                        <span className="truncate min-w-0">{choice.value}</span>
                        {isTaken && (
                            <span className="ml-2 text-xs text-gray-400 flex-shrink-0">
                                (visited)
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
