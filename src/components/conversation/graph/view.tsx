import { useMemo } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { usePersonas } from '@/hooks/usePersonas';
import type { StrandState, TreeState } from '../types';
import { TreeCanvas } from './canvas';
import { TreeEdge } from './edge';
import { TreeNode } from './node';

interface GraphViewProps {
    tree: TreeState;
    strand: StrandState;
    onSwitchToStrand: () => void;
}

interface LayoutNode {
    key: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 70;
const HORIZONTAL_GAP = 60;
const VERTICAL_GAP = 16;

/**
 * Displays the conversation tree as a graph with left-to-right layout.
 */
export function GraphView({ tree, strand, onSwitchToStrand }: GraphViewProps) {
    const { path, selectNode } = strand;
    const pathSet = useMemo(() => new Set(path), [path]);
    const personas = usePersonas();
    const personaTitles = useMemo(() => {
        const map = new Map<string, string>();
        for (const p of personas) {
            map.set(p.key, p.title);
        }
        return map;
    }, [personas]);

    // Calculate layout using depth-first traversal
    const layout = useMemo(() => {
        const positions = new Map<string, LayoutNode>();
        let currentY = 0;

        function layoutNode(
            key: string,
            depth: number,
        ): { minY: number; maxY: number } {
            const node = tree.nodes.get(key);
            if (!node) return { minY: currentY, maxY: currentY };

            const x = depth * (NODE_WIDTH + HORIZONTAL_GAP);

            if (node.children.length === 0) {
                // Leaf node - place at current Y position
                const y = currentY;
                positions.set(key, {
                    key,
                    x,
                    y,
                    width: NODE_WIDTH,
                    height: NODE_HEIGHT,
                });
                currentY += NODE_HEIGHT + VERTICAL_GAP;
                return { minY: y, maxY: y + NODE_HEIGHT };
            }

            // Layout children first
            let minChildY = Number.POSITIVE_INFINITY;
            let maxChildY = Number.NEGATIVE_INFINITY;

            for (const childKey of node.children) {
                const childBounds = layoutNode(childKey, depth + 1);
                minChildY = Math.min(minChildY, childBounds.minY);
                maxChildY = Math.max(maxChildY, childBounds.maxY);
            }

            // Center parent vertically among children
            const y = (minChildY + maxChildY - NODE_HEIGHT) / 2;
            positions.set(key, {
                key,
                x,
                y,
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
            });

            return {
                minY: Math.min(y, minChildY),
                maxY: Math.max(y + NODE_HEIGHT, maxChildY),
            };
        }

        // Layout all root nodes
        for (const rootKey of tree.rootNodes) {
            layoutNode(rootKey, 0);
        }

        return positions;
    }, [tree]);

    // Collect edges
    const edges = useMemo(() => {
        const result: Array<{ from: string; to: string }> = [];
        for (const [key, node] of tree.nodes) {
            for (const childKey of node.children) {
                result.push({ from: key, to: childKey });
            }
        }
        return result;
    }, [tree.nodes]);

    // Calculate the center position of the selected node for initial centering
    const selectedNodeCenter = useMemo(() => {
        if (!strand.selectedLeaf) return undefined;
        const pos = layout.get(strand.selectedLeaf);
        if (!pos) return undefined;
        return {
            x: pos.x + pos.width / 2,
            y: pos.y + pos.height / 2,
        };
    }, [strand.selectedLeaf, layout]);

    if (tree.nodes.size === 0) {
        return (
            <EmptyState
                message="No conversation yet"
                secondaryMessage="Switch to conversation view to start chatting"
            />
        );
    }

    return (
        <TreeCanvas initialCenter={selectedNodeCenter}>
            {/* Render edges first (behind nodes) */}
            <g className="edges">
                {edges.map(({ from, to }) => {
                    const fromPos = layout.get(from);
                    const toPos = layout.get(to);
                    if (!fromPos || !toPos) return null;

                    const isOnPath = pathSet.has(from) && pathSet.has(to);

                    return (
                        <TreeEdge
                            key={`${from}-${to}`}
                            fromX={fromPos.x + fromPos.width}
                            fromY={fromPos.y + fromPos.height / 2}
                            toX={toPos.x}
                            toY={toPos.y + toPos.height / 2}
                            highlighted={isOnPath}
                        />
                    );
                })}
            </g>

            {/* Render nodes */}
            <g className="nodes">
                {Array.from(layout.values()).map((pos) => {
                    const node = tree.nodes.get(pos.key);
                    if (!node) return null;

                    return (
                        <TreeNode
                            key={pos.key}
                            node={node}
                            personaTitle={personaTitles.get(node.author)}
                            x={pos.x}
                            y={pos.y}
                            width={pos.width}
                            height={pos.height}
                            isOnPath={pathSet.has(pos.key)}
                            isSelected={pos.key === strand.selectedLeaf}
                            onClick={() => selectNode(pos.key)}
                            onDoubleClick={() => {
                                selectNode(pos.key);
                                onSwitchToStrand();
                            }}
                            onGoTo={() => {
                                selectNode(pos.key);
                                onSwitchToStrand();
                            }}
                        />
                    );
                })}
            </g>
        </TreeCanvas>
    );
}
