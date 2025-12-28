import { eq } from '@bensku/y-query';
import { useQuery, useRow } from '@bensku/y-query-react';
import { memo, useState } from 'react';
import { useSpaceDoc } from '@/context/space';
import { usePersona } from '@/hooks/usePersonas';
import { FragmentTable, NodeTable } from '@/tables/node';
import { hashStringToHue } from '@/utils/colors';
import { FragmentRenderer } from './fragment';

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

    if (!node) {
        return null;
    }

    const isUser = node.role === 'user';

    // Generate hue from author name for LLM nodes (same as tree view)
    const llmHue = !isUser ? hashStringToHue(node.author || 'default') : 0;

    // Sort fragments by createdAt
    const sortedFragments = [...fragments].sort(
        (a, b) => a.createdAt - b.createdAt,
    );

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

                {/* Message content - render each fragment */}
                <div className="space-y-2 overflow-x-auto">
                    {sortedFragments.length > 0 ? (
                        sortedFragments.map((fragment) => (
                            <FragmentRenderer
                                key={fragment.key}
                                fragment={fragment}
                            />
                        ))
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
                    <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                    >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
                    </svg>
                </button>
            )}
        </div>
    );
});
