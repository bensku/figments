import { eq, type Row } from '@bensku/y-query';
import { useQuery, useRow } from '@bensku/y-query-react';
import { memo, useState } from 'react';
import Markdown from 'react-markdown';
import { useSpace } from '@/components/space';
import { FragmentTable, NodeTable } from '@/tables/node';
import { hashStringToHue } from '@/utils/colors';

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
    const doc = useSpace();
    const node = useRow(doc, NodeTable, id, 'content');
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
                        {isUser ? 'You' : node.author || 'Assistant'}
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

function FragmentRenderer({
    fragment,
}: {
    fragment: Row<typeof FragmentTable>;
}) {
    const [expanded, setExpanded] = useState(false);

    switch (fragment.data.type) {
        case 'thinking':
            return (
                <div className="text-sm">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setExpanded(!expanded);
                        }}
                        className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors hover:[text-shadow:_0_0_8px_rgb(156_163_175_/_0.5)]"
                    >
                        <svg
                            className={`w-3 h-3 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            aria-hidden="true"
                        >
                            <path
                                fillRule="evenodd"
                                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <span>Thinking</span>
                    </button>
                    {expanded && (
                        <div className="mt-2 pl-4 border-l-2 border-gray-200 text-gray-500">
                            <div className="prose prose-sm prose-gray max-w-none break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                                <Markdown>
                                    {fragment.data.text.toString()}
                                </Markdown>
                            </div>
                        </div>
                    )}
                </div>
            );

        case 'text':
            return (
                <div className="prose prose-sm max-w-none break-words">
                    <Markdown>{fragment.data.text.toString()}</Markdown>
                </div>
            );

        case 'toolCall':
            return (
                <div className="border border-amber-200 bg-amber-50 rounded px-3 py-2 text-sm text-amber-700">
                    <span className="font-medium">Tool Call</span>
                    <span className="text-gray-400 ml-2">
                        (details coming soon)
                    </span>
                </div>
            );

        case 'toolResult':
            return (
                <div className="border border-green-200 bg-green-50 rounded px-3 py-2 text-sm text-green-700">
                    <span className="font-medium">Tool Result</span>
                    <span className="text-gray-400 ml-2">
                        (details coming soon)
                    </span>
                </div>
            );

        default:
            return null;
    }
}
