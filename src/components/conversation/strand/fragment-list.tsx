import { eq, type Row } from '@bensku/y-query';
import { useQuery, useRow } from '@bensku/y-query-react';
import { useMemo } from 'react';
import { useSpaceDoc } from '@/context/space';
import { FragmentTable, NodeTable } from '@/tables/node';
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
export type FragmentGroup =
    | { type: 'text'; fragments: TextFragment[] }
    | {
          type: 'toolCall';
          fragment: ToolCallFragmentType;
          result?: ToolResultFragmentType;
      }
    | { type: 'other'; fragment: Fragment };

export function groupFragments(fragments: Fragment[]): FragmentGroup[] {
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

/**
 * Renders the full ordered fragment list for a node (text, thinking,
 * tool calls/results, files, etc). Shows a placeholder when there is
 * no content yet.
 *
 * When `skipFinalText` is set, trailing text fragments after the last
 * thinking/toolCall are hidden — matching the response extraction in
 * agentToTool so agent-call renderers can show progress without
 * duplicating the final response.
 */
export function NodeFragmentList({
    nodeId,
    skipFinalText = false,
}: {
    nodeId: string;
    skipFinalText?: boolean;
}) {
    const doc = useSpaceDoc();
    const node = useRow(doc, NodeTable, nodeId, 'content');
    const fragments = useQuery(
        doc,
        FragmentTable,
        () => eq('node', nodeId),
        [nodeId],
        'content',
    );

    const fragmentGroups = useMemo(() => {
        const sorted = [...fragments].sort((a, b) => a.offset - b.offset);
        let filtered = sorted;
        if (skipFinalText) {
            const toDrop = new Set<number>();
            for (let i = sorted.length - 1; i >= 0; i--) {
                const type = sorted[i]?.data.type;
                if (type === 'thinking' || type === 'toolCall') {
                    break;
                }
                if (type === 'text') {
                    toDrop.add(i);
                }
            }
            filtered = sorted.filter((_, i) => !toDrop.has(i));
        }
        return groupFragments(filtered);
    }, [fragments, skipFinalText]);

    return (
        <div className="space-y-2 overflow-x-auto">
            {fragmentGroups.length > 0 ? (
                fragmentGroups.map((group) => {
                    if (group.type === 'text') {
                        return (
                            <TextFragmentGroup
                                key={group.fragments[0]?.key}
                                fragments={group.fragments}
                            />
                        );
                    }
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
                    {node?.completed ? 'No content' : 'Waiting...'}
                </span>
            )}
        </div>
    );
}
