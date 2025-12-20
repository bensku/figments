import { useState, useMemo } from 'react';
import { useSpace } from '@/components/space';
import { useConversationTree } from './hooks/useConversationTree';
import { StrandView } from './strand/StrandView';
import { GraphView } from './graph/GraphView';
import { useView } from '@/context/view';

/**
 * Main container for conversation visualization.
 */
export function ConversationView() {
    const doc = useSpace();
    const tree = useConversationTree(doc);
    const { viewMode, setViewMode } = useView();

    // Find initial selected node (first root node, or null if empty)
    const initialNode = useMemo(() => {
        return tree.rootNodes[0] ?? null;
    }, [tree.rootNodes]);

    const [selectedNode, setSelectedNode] = useState<string | null>(
        initialNode,
    );

    const switchToStrand = () => setViewMode('strand');

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="flex-1 overflow-hidden">
                {viewMode === 'strand' ? (
                    <StrandView
                        selectedNode={selectedNode}
                        setSelectedNode={setSelectedNode}
                    />
                ) : (
                    <GraphView
                        tree={tree}
                        strand={{
                            selectedLeaf: selectedNode,
                            path: [],
                            selectNode: setSelectedNode,
                            selectBranch: (_, child) => setSelectedNode(child),
                            getSiblings: () => [],
                        }}
                        onSwitchToStrand={switchToStrand}
                    />
                )}
            </div>
        </div>
    );
}
