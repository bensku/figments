import type { Row } from '@bensku/y-query';
import type { NodeTable } from '@/tables/node';
import { hashStringToHue } from '@/utils/colors';

interface TimelineAlternativesProps {
    siblings: Row<typeof NodeTable>[];
    selectNode: (id: string) => void;
}

export function TimelineAlternatives({
    siblings,
    selectNode,
}: TimelineAlternativesProps) {
    if (siblings.length === 0) {
        return null;
    }

    return (
        <div className="space-y-1.5 pl-2">
            {siblings.map((sibling) => {
                const isUser = sibling.role === 'user';
                const hue = isUser
                    ? 220
                    : hashStringToHue(sibling.author || 'default');
                const dotColor = isUser ? '#93c5fd' : `hsl(${hue}, 50%, 65%)`;

                return (
                    <button
                        key={sibling.key}
                        type="button"
                        onClick={() => selectNode(sibling.key)}
                        className="w-full px-2 py-1.5 text-left text-xs rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors group"
                    >
                        <div className="flex items-center gap-1.5">
                            <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: dotColor }}
                            />
                            <span className="text-gray-600 font-medium truncate group-hover:text-gray-800">
                                {isUser ? 'You' : sibling.author || 'Assistant'}
                            </span>
                        </div>
                        <div className="text-gray-500 truncate mt-0.5 pl-3">
                            {sibling.summary || 'No summary'}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
