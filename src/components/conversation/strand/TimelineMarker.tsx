import type { Row } from '@bensku/y-query';
import type { NodeTable } from '@/tables/node';
import { hashStringToHue } from '@/utils/colors';

interface TimelineMarkerProps {
    node: Row<typeof NodeTable>;
    hasSiblings: boolean;
    isLast: boolean;
    isSelected: boolean;
}

export function TimelineMarker({
    node,
    hasSiblings,
    isLast,
    isSelected,
}: TimelineMarkerProps) {
    const isUser = node.role === 'user';
    const hue = isUser ? 220 : hashStringToHue(node.author || 'default');
    const markerColor = isUser ? '#60a5fa' : `hsl(${hue}, 60%, 55%)`;

    return (
        <div className="relative h-full w-full flex justify-center">
            {/* The marker - positioned at top */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                {hasSiblings ? (
                    // Diamond marker for nodes with siblings
                    <div
                        className="w-3 h-3 rotate-45"
                        style={{
                            backgroundColor: markerColor,
                            boxShadow: isSelected
                                ? `0 0 0 2px white, 0 0 0 4px ${markerColor}`
                                : undefined,
                        }}
                    />
                ) : (
                    // Dot marker for regular nodes
                    <div
                        className="w-2 h-2 rounded-full"
                        style={{
                            backgroundColor: markerColor,
                            boxShadow: isSelected
                                ? `0 0 0 2px white, 0 0 0 4px ${markerColor}`
                                : undefined,
                        }}
                    />
                )}
            </div>

            {/* Line extending from marker to bottom */}
            {!isLast && (
                <div className="absolute top-3 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-gray-300" />
            )}
        </div>
    );
}
