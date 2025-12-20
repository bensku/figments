import { any, type Row } from '@bensku/y-query';
import { useQuery } from '@bensku/y-query-react';
import { useCallback, useMemo } from 'react';
import { NodeTable } from '@/tables/node';
import { useSpace } from '../../space';
import { MessageInput } from './MessageInput';
import { StrandNode } from './StrandNode';
import { TimelineAlternatives } from './TimelineAlternatives';
import { TimelineMarker } from './TimelineMarker';

export function StrandView({
    selectedNode,
    setSelectedNode,
}: {
    selectedNode: string | null;
    setSelectedNode: (id: string | null) => void;
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

    // If no node has been selected, "select" root for now to show something
    if (!selectedNode) {
        const roots = parentToNode.get('root');
        if (!roots || !roots[0]) {
            return (
                <div className="flex flex-col h-full">
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        Start a new conversation
                    </div>
                    <div className="w-full max-w-6xl mx-auto px-4 lg:px-8 pb-6">
                        <div className="max-w-[calc(100%-14rem)]">
                            <MessageInput
                                node={null}
                                selectNode={setSelectedNode}
                            />
                        </div>
                    </div>
                </div>
            );
        }
        selectedNode = roots[0].key;
    }

    // Compute nodes visible on this strand:
    // 1. Path from root to selected node (including the selected node)
    // 2. Descendants of selected node until the first branch
    // 3. Separately rendered: the branch options
    // Node renderers will figure out their own siblings
    const [forwardNodes, branchNodes] = loadForward(parentToNode, selectedNode);
    const strandNodes = [
        ...loadBackward(nodeMap, selectedNode),
        ...forwardNodes,
    ];

    // Empty space case: show placeholder and message input NOT attached to a node
    if (strandNodes.length === 0 && !selectedNode) {
        return (
            <div className="flex flex-col h-full">
                <div className="flex-1 flex items-center justify-center text-gray-400">
                    Start a new conversation
                </div>
                <div className="w-full max-w-6xl mx-auto px-4 lg:px-8 pb-6">
                    <div className="max-w-[calc(100%-14rem)]">
                        <MessageInput
                            node={null}
                            selectNode={setSelectedNode}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // Find where the selected node is in the strand
    const selectedIndex = strandNodes.findIndex((n) => n.key === selectedNode);
    const selectedNodeData =
        selectedIndex >= 0 ? (strandNodes[selectedIndex] ?? null) : null;

    return (
        <div className="h-full overflow-y-auto">
            {/* Strand nodes with timeline */}
            <div className="w-full max-w-6xl mx-auto px-4 lg:px-8">
                <div className="grid grid-cols-[1fr_2rem_12rem]">
                    {strandNodes.map((node, index) => {
                        const siblings = getSiblings(node.key);
                        const isLast =
                            index === strandNodes.length - 1 &&
                            branchNodes.length === 0;

                        return (
                            <div key={node.key} className="contents">
                                {/* Message cell */}
                                <div className="py-4 pr-4 min-w-0">
                                    <StrandNode
                                        id={node.key}
                                        selected={node.key === selectedNode}
                                        selectNode={setSelectedNode}
                                    />

                                    {/* Message input appears right after the selected LLM node */}
                                    {node.key === selectedNode &&
                                        node.role === 'llm' && (
                                            <div className="mt-4">
                                                <MessageInput
                                                    node={selectedNodeData}
                                                    selectNode={setSelectedNode}
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

                                {/* Alternatives cell */}
                                <div className="pt-4">
                                    <TimelineAlternatives
                                        siblings={siblings}
                                        selectNode={setSelectedNode}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Branch options - each branch gets full content column width */}
            {branchNodes.length > 0 && (
                <div className="w-full px-4 lg:px-8 pb-6">
                    {branchNodes.length <= 3 ? (
                        // Full StrandNode components side-by-side, equal width
                        <div className="flex gap-4">
                            {branchNodes.map((node) => (
                                <div key={node.key} className="flex-1 min-w-0">
                                    <StrandNode
                                        id={node.key}
                                        selected={false}
                                        selectNode={setSelectedNode}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        // Grid of cards with summaries for > 3 options
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-6xl">
                            {branchNodes.map((node) => (
                                <button
                                    key={node.key}
                                    type="button"
                                    onClick={() => setSelectedNode(node.key)}
                                    className="p-3 text-left rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                                >
                                    <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                                        {node.role === 'user'
                                            ? 'You'
                                            : node.author || 'LLM'}
                                    </div>
                                    <div className="text-sm text-gray-700 line-clamp-2">
                                        {node.summary || 'No summary'}
                                    </div>
                                </button>
                            ))}
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
