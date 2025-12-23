interface TreeEdgeProps {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    highlighted: boolean;
}

/**
 * Renders a curved edge between two nodes.
 */
export function TreeEdge({
    fromX,
    fromY,
    toX,
    toY,
    highlighted,
}: TreeEdgeProps) {
    // Create a curved path using cubic bezier
    const midX = (fromX + toX) / 2;
    const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;

    return (
        <path
            d={path}
            fill="none"
            stroke={highlighted ? '#3b82f6' : '#d1d5db'}
            strokeWidth={highlighted ? 3 : 2}
            className="transition-all duration-150"
        />
    );
}
