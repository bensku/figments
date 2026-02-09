import { eq, type Row, upsert } from '@bensku/y-query';
import { useQuery, useRow } from '@bensku/y-query-react';
import { Crosshair, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
    sourceBadgeStyles,
    sourceLabels,
} from '@/components/settings/persona/constants';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useSpace, useSpaceDoc } from '@/context/space';
import { useAvailablePersonas } from '@/hooks/useAvailablePersonas';
import { usePersona } from '@/hooks/usePersonas';
import { sendMessage } from '@/sync/hocuspocus';
import {
    deleteNodeWithDescendants,
    FragmentTable,
    NodeTable,
} from '@/tables/node';
import { hashStringToHue } from '@/utils/colors';
import {
    FragmentRenderer,
    TextFragmentGroup,
    ToolCallFragment,
} from './fragment';

type Fragment = Row<typeof FragmentTable>;
type FragmentData = Fragment['data'];
type TextFragment = Fragment & {
    data: Extract<FragmentData, { type: 'text' }>;
};
type ToolCallFragmentType = Fragment & {
    data: Extract<FragmentData, { type: 'toolCall' }>;
};
type ToolResultFragmentType = Fragment & {
    data: Extract<FragmentData, { type: 'toolResult' }>;
};

/**
 * Groups consecutive text fragments together for proper markdown rendering.
 * Tool calls are paired with their results when available.
 * Non-text fragments are kept as single items.
 */
type FragmentGroup =
    | { type: 'text'; fragments: TextFragment[] }
    | {
          type: 'toolCall';
          fragment: ToolCallFragmentType;
          result?: ToolResultFragmentType;
      }
    | { type: 'other'; fragment: Fragment };

function groupFragments(fragments: Fragment[]): FragmentGroup[] {
    const groups: FragmentGroup[] = [];

    // Build a map of callId -> toolResult for quick lookup
    const resultsByCallId = new Map<string, ToolResultFragmentType>();
    for (const fragment of fragments) {
        if (fragment.data.type === 'toolResult') {
            resultsByCallId.set(
                fragment.data.callId,
                fragment as ToolResultFragmentType,
            );
        }
    }

    // Track which results have been paired with calls
    const pairedResultKeys = new Set<string>();

    for (const fragment of fragments) {
        if (fragment.data.type === 'text') {
            const lastGroup = groups[groups.length - 1];
            if (lastGroup?.type === 'text') {
                // Add to existing text group
                lastGroup.fragments.push(fragment as TextFragment);
            } else {
                // Start new text group
                groups.push({
                    type: 'text',
                    fragments: [fragment as TextFragment],
                });
            }
        } else if (fragment.data.type === 'toolCall') {
            // Look for matching result
            const result = resultsByCallId.get(fragment.data.callId);
            if (result) {
                pairedResultKeys.add(result.key);
            }
            groups.push({
                type: 'toolCall',
                fragment: fragment as ToolCallFragmentType,
                result,
            });
        } else if (fragment.data.type === 'toolResult') {
            // Skip if already paired with a call
            if (pairedResultKeys.has(fragment.key)) {
                continue;
            }
            // Orphaned result (shouldn't happen normally)
            groups.push({ type: 'other', fragment });
        } else {
            // Non-text fragment, keep separate
            groups.push({ type: 'other', fragment });
        }
    }

    return groups;
}

interface StrandNodeProps {
    id: string;
    selected: boolean;
    focused: boolean;
    selectNode: (id: string | null) => void;
    focusNode: (id: string | null) => void;
}

export const StrandNode = memo(function StrandNode({
    id,
    selected,
    focused,
    selectNode,
    focusNode,
}: StrandNodeProps) {
    const doc = useSpaceDoc();
    const { provider, readOnly } = useSpace();
    const node = useRow(doc, NodeTable, id, 'content');
    const persona = usePersona(node?.author);
    const [isHovered, setIsHovered] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
    const [showPersonaPicker, setShowPersonaPicker] = useState(false);

    // Get available personas for generate reply
    const { allPersonasWithSource } = useAvailablePersonas(doc);

    // Check if node has children (for showing "generate reply" on user messages)
    const children = useQuery(
        doc,
        NodeTable,
        () => eq('parentId', id),
        [id],
        'content',
    );
    const hasChildren = children.length > 0;

    // Get node's fragments (content)
    const fragments = useQuery(
        doc,
        FragmentTable,
        () => eq('node', id),
        [id],
        'content',
    );

    // Sort fragments by createdAt and group consecutive text fragments
    // Must be before early return to satisfy React hooks rules
    const fragmentGroups = useMemo(() => {
        const sorted = [...fragments].sort((a, b) => a.createdAt - b.createdAt);
        return groupFragments(sorted);
    }, [fragments]);

    if (!node) {
        return null;
    }

    const isUser = node.role === 'user';
    const isLlm = node.role === 'llm';
    const canRegenerate = isLlm && provider !== null && !readOnly;
    const canGenerateReply =
        isUser && !hasChildren && provider !== null && !readOnly;

    // Generate hue from author name for LLM nodes (same as tree view)
    const llmHue = !isUser ? hashStringToHue(node.author || 'default') : 0;

    // Color for selected indicator border (same as dot indicator)
    const indicatorColor = isUser ? '#60a5fa' : `hsl(${llmHue}, 60%, 55%)`;

    const handleGenerateReply = (personaKey: string) => {
        if (!provider) return;

        // Create LLM node as child
        const replyKey = crypto.randomUUID();
        upsert(doc, NodeTable, {
            key: replyKey,
            parentId: id,
            role: 'llm',
            createdAt: Date.now(),
            author: personaKey,
            summary: '',
            completed: false,
        });

        // Request generation
        sendMessage(provider, {
            type: 'generate',
            node: replyKey,
            role: 'main',
            force: false,
        });

        // Focus on the new reply
        focusNode(replyKey);
        setShowPersonaPicker(false);
    };

    const handleRegenerate = () => {
        if (!provider) return;
        sendMessage(provider, {
            type: 'generate',
            node: id,
            role: 'main',
            force: true,
        });
    };

    const handleRegenerateClick = () => {
        // If still generating, ask for confirmation (might be stuck or active)
        if (!node.completed) {
            setShowRegenerateConfirm(true);
        } else {
            handleRegenerate();
        }
    };

    const handleDelete = () => {
        const parentId = deleteNodeWithDescendants(doc, id);
        // Navigate to parent after deletion
        focusNode(parentId);
        setShowDeleteConfirm(false);
    };

    return (
        // biome-ignore lint/a11y/noStaticElementInteractions: Hover tracking only
        <div
            className="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Main message content */}
            {/* biome-ignore lint/a11y/useSemanticElements: Contains nested interactive elements */}
            <div
                role="button"
                tabIndex={0}
                onClick={() => selectNode(id)}
                onDoubleClick={() => focusNode(id)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectNode(id);
                    }
                }}
                className={`min-w-0 py-2 text-left rounded transition-colors ${
                    selected
                        ? 'border-l-4 pl-3'
                        : focused
                          ? 'border-l-2 border-dashed pl-3.5'
                          : 'hover:bg-gray-50 cursor-pointer pl-4'
                }`}
                style={
                    selected
                        ? { borderLeftColor: indicatorColor }
                        : focused
                          ? { borderLeftColor: `${indicatorColor}80` } // 50% opacity
                          : undefined
                }
            >
                {/* Header: role label + streaming indicator */}
                <div className="flex items-center gap-2 mb-2">
                    <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium"
                        style={{
                            color: isUser
                                ? '#2563eb'
                                : `hsl(${llmHue}, 70%, 35%)`,
                        }}
                    >
                        <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                                backgroundColor: isUser
                                    ? '#60a5fa'
                                    : `hsl(${llmHue}, 60%, 55%)`,
                            }}
                        />
                        {isUser ? 'You' : persona?.title || 'Assistant'}
                    </span>
                    {!node.completed && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                            <span
                                className="animate-pulse"
                                style={{
                                    color: isUser
                                        ? '#60a5fa'
                                        : `hsl(${llmHue}, 60%, 55%)`,
                                }}
                            >
                                ●
                            </span>
                            typing
                        </span>
                    )}
                </div>

                {/* Message content */}
                <div className="space-y-2 overflow-x-auto">
                    {fragmentGroups.length > 0 ? (
                        fragmentGroups.map((group) => {
                            if (group.type === 'text') {
                                // Multiple text fragments are grouped together to avoid strange
                                // rendering issues; this is pretty complicate, see TextFragmentGroup for details
                                return (
                                    <TextFragmentGroup
                                        key={group.fragments[0]?.key}
                                        fragments={group.fragments}
                                    />
                                );
                            }
                            // Tool call fragments need also tool results
                            if (group.type === 'toolCall') {
                                return (
                                    <ToolCallFragment
                                        key={group.fragment.key}
                                        fragment={group.fragment}
                                        result={group.result?.data.output}
                                    />
                                );
                            }
                            return (
                                <FragmentRenderer
                                    key={group.fragment.key}
                                    fragment={group.fragment}
                                />
                            );
                        })
                    ) : (
                        <span className="text-gray-400 italic">
                            {node.completed ? 'No content' : 'Waiting...'}
                        </span>
                    )}
                </div>
            </div>

            {/* Action buttons - appear on hover, positioned absolutely */}
            {isHovered && (
                <div className="absolute top-2 right-2 flex gap-1">
                    {/* Generate reply button - user messages with no children only */}
                    {canGenerateReply && (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowPersonaPicker(!showPersonaPicker);
                                }}
                                className="p-1.5 bg-white/90 hover:bg-purple-100 rounded-full text-gray-400 hover:text-purple-600 transition-colors shadow-sm border border-gray-200"
                                title="Generate reply"
                            >
                                <Sparkles
                                    className="w-4 h-4"
                                    aria-hidden="true"
                                />
                            </button>
                            {/* Persona picker dropdown */}
                            {showPersonaPicker && (
                                <PersonaPicker
                                    personas={allPersonasWithSource}
                                    onSelect={handleGenerateReply}
                                    onClose={() => setShowPersonaPicker(false)}
                                />
                            )}
                        </div>
                    )}
                    {/* Regenerate button - LLM messages only */}
                    {canRegenerate && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRegenerateClick();
                            }}
                            className="p-1.5 bg-white/90 hover:bg-blue-100 rounded-full text-gray-400 hover:text-blue-600 transition-colors shadow-sm border border-gray-200"
                            title="Regenerate response"
                        >
                            <RefreshCw className="w-4 h-4" aria-hidden="true" />
                        </button>
                    )}
                    {/* Delete button */}
                    {!readOnly && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteConfirm(true);
                            }}
                            className="p-1.5 bg-white/90 hover:bg-red-100 rounded-full text-gray-400 hover:text-red-600 transition-colors shadow-sm border border-gray-200"
                            title="Delete message"
                        >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                    )}
                    {/* Focus button */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            focusNode(id);
                        }}
                        className="p-1.5 bg-white/90 hover:bg-blue-100 rounded-full text-gray-400 hover:text-blue-600 transition-colors shadow-sm border border-gray-200"
                        title="Focus on this branch"
                    >
                        <Crosshair className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>
            )}

            {/* Delete confirmation dialog */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                title="Delete message?"
                message="This will permanently delete this message and all replies."
                confirmLabel="Delete"
                confirmVariant="danger"
            />

            {/* Regenerate confirmation dialog (for stuck/in-progress messages) */}
            <ConfirmDialog
                isOpen={showRegenerateConfirm}
                onConfirm={() => {
                    handleRegenerate();
                    setShowRegenerateConfirm(false);
                }}
                onCancel={() => setShowRegenerateConfirm(false)}
                title="Regenerate message?"
                message="This message appears to still be generating. Regenerating will restart the generation from scratch."
                confirmLabel="Regenerate"
                confirmVariant="primary"
            />
        </div>
    );
});

/**
 * Dropdown picker for selecting a persona to generate a reply.
 */
function PersonaPicker({
    personas,
    onSelect,
    onClose,
}: {
    personas: { persona: { key: string; title: string }; source: string }[];
    onSelect: (personaKey: string) => void;
    onClose: () => void;
}) {
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node)
            ) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    return (
        <div
            ref={dropdownRef}
            className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={() => {}}
            role="menu"
        >
            <div className="px-3 py-1.5 text-xs font-medium text-gray-500 border-b border-gray-100">
                Generate reply with...
            </div>
            {personas.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                    No personas available
                </div>
            ) : (
                personas.map(({ persona, source }) => (
                    <button
                        key={persona.key}
                        type="button"
                        onClick={() => onSelect(persona.key)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left"
                        role="menuitem"
                    >
                        <span className="font-medium truncate flex-1">
                            {persona.title || persona.key}
                        </span>
                        <span
                            className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${
                                sourceBadgeStyles[
                                    source as keyof typeof sourceBadgeStyles
                                ] ?? 'bg-gray-100 text-gray-600'
                            }`}
                        >
                            {sourceLabels[
                                source as keyof typeof sourceLabels
                            ] ?? source}
                        </span>
                    </button>
                ))
            )}
        </div>
    );
}
