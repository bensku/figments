import { any, type Row } from '@bensku/y-query';
import { useQuery } from '@bensku/y-query-react';
import { useCallback, useMemo } from 'react';
import { NodeTable } from '@/tables/node';
import { hashStringToHue } from '@/utils/colors';
import { useSpace } from '../../space';
import { MessageInput } from './MessageInput';
import { StrandNode } from './StrandNode';
import { TimelineAlternatives } from './TimelineAlternatives';
import { TimelineMarker } from './TimelineMarker';

export function StrandView({
    selectedNode,
    focusedNode,
    selectNode,
    focusNode,
    depth,
}: {
    selectedNode: string | null;
    focusedNode: string | null;
    selectNode: (id: string | null) => void;
    focusNode: (id: string | null) => void;
    depth: number;
}) {
    const doc = useSpace();

    // Get ALL nodes in space and subscribe to addition/removal
    // We'll be recomputing ~everything when this occurs, but with a few hundred nodes at most it shouldn't be a problem
    const nodes = useQuery(doc, NodeTable, () => any(), [], 'keys');

    // Build lookup maps
    const { nodeMap, parentToNode } = useMemo(() => {
        const nodeMap = new Map<string, Row<typeof NodeTable>>();
        const parentToNode = new Map<string, Row<typeof NodeTable>[]>();

        for (const node of nodes) {
            nodeMap.set(node.key, node);

            // Group children by parentId
            const siblings = parentToNode.get(node.parentId) ?? [];
            siblings.push(node);
            parentToNode.set(node.parentId, siblings);
        }

        return { nodeMap, parentToNode };
    }, [nodes]);

    // Helper to get siblings for a node (excluding the node itself)
    const getSiblings = useCallback(
        (nodeKey: string) => {
            const node = nodeMap.get(nodeKey);
            if (!node) return [];
            return (
                parentToNode
                    .get(node.parentId)
                    ?.filter((s) => s.key !== nodeKey) ?? []
            );
        },
        [nodeMap, parentToNode],
    );

    // If no node has been focused, "focus" root for now to show something
    let effectiveFocusedNode = focusedNode;
    if (!effectiveFocusedNode) {
        const roots = parentToNode.get('root');
        if (!roots || !roots[0]) {
            return (
                <div className="flex flex-col h-full">
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        Start a new conversation
                    </div>
                    <div className="w-full max-w-6xl mx-auto px-4 lg:px-8 pb-6">
                        <div className="max-w-[calc(100%-14rem)]">
                            <MessageInput node={null} selectNode={focusNode} />
                        </div>
                    </div>
                </div>
            );
        }
        effectiveFocusedNode = roots[0].key;
    }

    // Compute nodes visible on this strand:
    // 1. Path from root to focused node (including the focused node)
    // 2. Descendants of focused node until the first branch
    // 3. Separately rendered: the branch options
    // Node renderers will figure out their own siblings
    const [forwardNodes, branchNodes] = loadForward(
        parentToNode,
        effectiveFocusedNode,
    );
    const strandNodes: Row<typeof NodeTable>[] = [];
    if (depth === 0) {
        // Only the top-level strand view shows history
        strandNodes.push(...loadBackward(nodeMap, effectiveFocusedNode));
    } else {
        // For nested views, include the focused node itself (not included in loadBackward)
        const focusedNodeRow = nodeMap.get(effectiveFocusedNode);
        if (focusedNodeRow) {
            strandNodes.push(focusedNodeRow);
        }
    }
    strandNodes.push(...forwardNodes);

    // Empty space case: show placeholder and message input NOT attached to a node
    if (strandNodes.length === 0 && !effectiveFocusedNode) {
        return (
            <div className="flex flex-col h-full">
                <div className="flex-1 flex items-center justify-center text-gray-400">
                    Start a new conversation
                </div>
                <div className="w-full max-w-6xl mx-auto px-4 lg:px-8 pb-6">
                    <div className="max-w-[calc(100%-14rem)]">
                        <MessageInput node={null} selectNode={focusNode} />
                    </div>
                </div>
            </div>
        );
    }

    // Find where the selected node is in the strand
    const selectedIndex = strandNodes.findIndex((n) => n.key === selectedNode);
    const selectedNodeData =
        selectedIndex >= 0 ? (strandNodes[selectedIndex] ?? null) : null;

    // Nested strands use a simpler layout without the left spacer
    const isNested = depth > 0;

    return (
        <div className={isNested ? '' : 'h-full overflow-y-auto'}>
            {/* Strand nodes with timeline */}
            <div className={isNested ? '' : 'w-full px-4 lg:px-8'}>
                <div
                    className={
                        isNested
                            ? 'grid grid-cols-[1fr_2rem]'
                            : 'mx-auto max-w-[76rem] grid grid-cols-[14rem_1fr_2rem_12rem]'
                    }
                >
                    {strandNodes.map((node, index) => {
                        const siblings = getSiblings(node.key);
                        const isLast =
                            index === strandNodes.length - 1 &&
                            branchNodes.length === 0;

                        return (
                            <div key={node.key} className="contents">
                                {/* Left spacer (balances timeline + alternatives) - only for top-level */}
                                {!isNested && <div />}

                                {/* Message cell */}
                                <div className="py-4 pr-4 min-w-0">
                                    <StrandNode
                                        id={node.key}
                                        selected={node.key === selectedNode}
                                        focused={
                                            !isNested &&
                                            node.key === effectiveFocusedNode
                                        }
                                        selectNode={selectNode}
                                        focusNode={focusNode}
                                    />

                                    {/* Message input appears right after the selected LLM node */}
                                    {node.key === selectedNode &&
                                        node.role === 'llm' && (
                                            <div className="mt-4">
                                                <MessageInput
                                                    node={selectedNodeData}
                                                    selectNode={focusNode}
                                                />
                                            </div>
                                        )}
                                </div>

                                {/* Timeline cell */}
                                <div className="pt-4">
                                    <TimelineMarker
                                        node={node}
                                        hasSiblings={siblings.length > 0}
                                        isLast={isLast}
                                        isSelected={node.key === selectedNode}
                                    />
                                </div>

                                {/* Alternatives cell - only for top-level */}
                                {!isNested && (
                                    <div className="pt-4">
                                        <TimelineAlternatives
                                            siblings={siblings}
                                            selectNode={focusNode}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Branch options - each branch gets full horizontal space */}
            {branchNodes.length > 0 && (
                <div>
                    {branchNodes.length <= 3 && depth === 0 ? (
                        // Show branches until they branch again
                        <div className="flex gap-6 px-4 py-4">
                            {branchNodes.map((node) => (
                                <div key={node.key} className="flex-1 min-w-0">
                                    <StrandView
                                        selectedNode={selectedNode}
                                        focusedNode={node.key}
                                        selectNode={selectNode}
                                        focusNode={focusNode}
                                        depth={depth + 1}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        // Grid of cards with summaries for > 3 options or nested branches
                        <div
                            className={
                                isNested
                                    ? 'grid grid-cols-2 gap-3 px-4 py-2'
                                    : 'mx-auto max-w-[76rem] grid grid-cols-2 md:grid-cols-3 gap-3 pl-[14rem] pr-[14rem] py-2'
                            }
                        >
                            {branchNodes.map((node) => {
                                const isUser = node.role === 'user';
                                const llmHue = !isUser
                                    ? hashStringToHue(node.author || 'default')
                                    : 0;
                                const textColor = isUser
                                    ? '#2563eb'
                                    : `hsl(${llmHue}, 70%, 35%)`;

                                return (
                                    <button
                                        key={node.key}
                                        type="button"
                                        onClick={() => focusNode(node.key)}
                                        className="p-3 text-left rounded-md bg-gray-50/50 hover:bg-gray-100 transition-colors"
                                    >
                                        <div
                                            className="text-xs font-medium mb-1"
                                            style={{ color: textColor }}
                                        >
                                            {isUser
                                                ? 'You'
                                                : node.author || 'assistant'}
                                        </div>
                                        <div className="text-sm text-gray-600 line-clamp-2">
                                            {node.summary || 'No summary'}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function loadBackward(
    nodeMap: Map<string, Row<typeof NodeTable>>,
    selected: string | null,
) {
    if (!selected) return [];

    const nodes: Row<typeof NodeTable>[] = [];
    let nextId: string = selected;
    while (nextId !== 'root') {
        const node = nodeMap.get(nextId);
        if (node) {
            nodes.push(node);
            nextId = node.parentId;
        } else {
            break;
        }
    }
    nodes.reverse();
    return nodes;
}

function loadForward(
    parentToNode: Map<string, Row<typeof NodeTable>[]>,
    selected: string,
): [Row<typeof NodeTable>[], Row<typeof NodeTable>[]] {
    const nodes: Row<typeof NodeTable>[] = [];
    let parentId = selected;
    for (;;) {
        const children = parentToNode.get(parentId) ?? [];
        if (children.length === 1 && children[0]) {
            nodes.push(children[0]);
            parentId = children[0].key;
        } else {
            return [nodes, children];
        }
    }
}
