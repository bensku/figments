import type { Row } from '@bensku/y-query';
import { eq } from '@bensku/y-query';
import { useQuery, useRow } from '@bensku/y-query-react';
import { Crosshair } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useSpaceDoc } from '@/context/space';
import { usePersona } from '@/hooks/usePersonas';
import { FragmentTable, NodeTable } from '@/tables/node';
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
    const node = useRow(doc, NodeTable, id, 'content');
    const persona = usePersona(node?.author);
    const [isHovered, setIsHovered] = useState(false);

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

    // Generate hue from author name for LLM nodes (same as tree view)
    const llmHue = !isUser ? hashStringToHue(node.author || 'default') : 0;

    // Color for selected indicator border (same as dot indicator)
    const indicatorColor = isUser ? '#60a5fa' : `hsl(${llmHue}, 60%, 55%)`;

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

            {/* Focus button - appears on hover, positioned absolutely */}
            {isHovered && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        focusNode(id);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-blue-100 rounded-full text-gray-400 hover:text-blue-600 transition-colors shadow-sm border border-gray-200"
                    title="Focus on this branch"
                >
                    <Crosshair className="w-4 h-4" aria-hidden="true" />
                </button>
            )}
        </div>
    );
});
