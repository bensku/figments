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
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <circle cx="12" cy="18" r="3" />
                        <circle cx="6" cy="6" r="3" />
                        <circle cx="18" cy="6" r="3" />
                        <path d="M12 15V12a3 3 0 0 0-3-3H9M12 12a3 3 0 0 1 3-3h0" />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={() => openSettings('personas')}
                    className="p-2 rounded-lg bg-white/80 hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900 shadow-sm border border-gray-200"
                    title="Presets"
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={() => openSettings('general')}
                    className="p-2 rounded-lg bg-white/80 hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900 shadow-sm border border-gray-200"
                    title="Settings"
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
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
