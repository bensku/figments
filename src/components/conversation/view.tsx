import { Network, Settings, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SettingsTab } from '@/components/settings/modal';
import { SettingsModal } from '@/components/settings/modal';
import { useSpaceDoc } from '@/context/space';
import { useView } from '@/context/view';
import { useShortcuts } from '@/hooks/useShortcuts';
import { GraphView } from './graph/view';
import { useConversationTree } from './hooks/useConversationTree';
import { StrandView } from './strand/view';

interface ConversationViewProps {
    initialFocusedNode: string | null;
    onFocusChange: (nodeId: string | null) => void;
}

/**
 * Main container for conversation visualization.
 */
export function ConversationView({
    initialFocusedNode,
    onFocusChange,
}: ConversationViewProps) {
    const doc = useSpaceDoc();
    const tree = useConversationTree(doc);
    const { viewMode, setViewMode, toggleViewMode } = useView();

    // Find default node (first root node, or null if empty)
    const defaultNode = useMemo(() => {
        return tree.rootNodes[0] ?? null;
    }, [tree.rootNodes]);

    // Use URL-provided node if valid, otherwise fall back to default
    const resolvedInitialNode = useMemo(() => {
        if (initialFocusedNode && tree.nodes.has(initialFocusedNode)) {
            return initialFocusedNode;
        }
        return defaultNode;
    }, [initialFocusedNode, tree.nodes, defaultNode]);

    const [selectedNode, setSelectedNode] = useState<string | null>(
        resolvedInitialNode,
    );
    const [focusedNode, setFocusedNode] = useState<string | null>(
        resolvedInitialNode,
    );

    // Sync internal state when URL-derived node changes (e.g., browser back/forward)
    useEffect(() => {
        setFocusedNode(resolvedInitialNode);
        setSelectedNode(resolvedInitialNode);
    }, [resolvedInitialNode]);

    // Single click - only select (for main strand nodes)
    const selectNode = useCallback((id: string | null) => {
        setSelectedNode(id);
    }, []);

    // Double click, focus button, or clicking alternatives/branches - select AND focus
    const focusNode = useCallback(
        (id: string | null) => {
            setSelectedNode(id);
            setFocusedNode(id);
            onFocusChange(id);
        },
        [onFocusChange],
    );

    // Add keyboard shortcuts
    const shortcuts = useMemo(
        () => ({
            'Control+Space': toggleViewMode,
        }),
        [toggleViewMode],
    );
    useShortcuts(shortcuts);

    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsDefaultTab, setSettingsDefaultTab] =
        useState<SettingsTab>('general');

    const openSettings = (tab: SettingsTab) => {
        setSettingsDefaultTab(tab);
        setSettingsOpen(true);
    };

    return (
        <div className="relative flex flex-col h-full bg-white">
            {/* Floating action buttons */}
            <div className="absolute top-3 right-3 z-10 flex gap-1">
                <button
                    type="button"
                    onClick={toggleViewMode}
                    className="p-2 rounded-lg bg-white/80 hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900 shadow-sm border border-gray-200"
                    title={
                        viewMode === 'strand'
                            ? 'Show tree (Ctrl+Space)'
                            : 'Show chat (Ctrl+Space)'
                    }
                >
                    <Network width="18" height="18" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={() => openSettings('personas')}
                    className="p-2 rounded-lg bg-white/80 hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900 shadow-sm border border-gray-200"
                    title="Presets"
                >
                    <Users width="18" height="18" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={() => openSettings('general')}
                    className="p-2 rounded-lg bg-white/80 hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900 shadow-sm border border-gray-200"
                    title="Settings"
                >
                    <Settings width="18" height="18" aria-hidden="true" />
                </button>
            </div>

            {settingsOpen && (
                <SettingsModal
                    isOpen={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
                    defaultTab={settingsDefaultTab}
                />
            )}

            <div className="flex-1 overflow-hidden">
                {viewMode === 'strand' ? (
                    <StrandView
                        selectedNode={selectedNode}
                        focusedNode={focusedNode}
                        selectNode={selectNode}
                        focusNode={focusNode}
                        depth={0}
                    />
                ) : (
                    <GraphView
                        tree={tree}
                        strand={{
                            selectedLeaf: selectedNode,
                            path: [],
                            selectNode: focusNode,
                            selectBranch: (_, child) => focusNode(child),
                            getSiblings: () => [],
                        }}
                        onSwitchToStrand={() => setViewMode('strand')}
                    />
                )}
            </div>
        </div>
    );
}
