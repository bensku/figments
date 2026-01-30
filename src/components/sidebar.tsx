import { any, type Row, remove, update, upsert } from '@bensku/y-query';
import { useQuery } from '@bensku/y-query-react';
import { ChevronsLeftRight, LogOut, Settings } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'wouter';
import { navigate } from 'wouter/use-browser-location';
import type * as Y from 'yjs';
import { SettingsModal } from '@/components/settings/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
    Dropdown,
    DropdownItem,
    DropdownSeparator,
} from '@/components/ui/dropdown';
import { useUI } from '@/context/ui';
import { useUser } from '@/context/user';
import { useAutoFocus } from '@/hooks/useAutoFocus';
import { SpaceTable } from '@/tables/user';

export const Sidebar = ({ openSpace }: { openSpace: string }) => {
    const { displayName, userDoc } = useUser();
    const { sidebarCollapsed } = useUI();
    const [isHovered, setIsHovered] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Show sidebar when expanded OR when collapsed but hovered
    const showSidebar = !sidebarCollapsed || isHovered;
    const isOverlay = sidebarCollapsed && isHovered;

    return (
        // biome-ignore lint/a11y/noStaticElementInteractions: Hover detection for sidebar expansion
        <div
            role="presentation"
            className="relative h-full shrink-0"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Spacer - takes up space in the layout */}
            <div
                className={`${sidebarCollapsed ? 'w-0' : 'w-64'} h-full transition-all duration-200`}
            />

            {/* Hover trigger zone when collapsed */}
            {sidebarCollapsed && !isHovered && (
                <div className="absolute left-0 top-0 w-3 h-full z-10" />
            )}

            {/* Sidebar content - either in-flow or overlay */}
            {showSidebar && (
                <div
                    className={`
                        ${isOverlay ? 'absolute left-0 top-0 shadow-xl z-20' : 'absolute left-0 top-0'}
                        w-64 h-full bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-200
                    `}
                >
                    {!userDoc ? (
                        <div className="p-4">
                            <div className="text-gray-400 text-sm">
                                Loading...
                            </div>
                        </div>
                    ) : (
                        <SidebarContent
                            doc={userDoc}
                            displayName={displayName}
                            openSpace={openSpace}
                            isOverlay={isOverlay}
                            onOpenSettings={() => setSettingsOpen(true)}
                        />
                    )}
                </div>
            )}

            {settingsOpen && (
                <SettingsModal
                    isOpen={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
                    defaultTab="general"
                />
            )}
        </div>
    );
};

function SidebarContent({
    doc,
    displayName,
    openSpace,
    isOverlay,
    onOpenSettings,
}: {
    doc: Y.Doc;
    displayName: string;
    openSpace: string;
    isOverlay: boolean;
    onOpenSettings: () => void;
}) {
    const { sidebarCollapsed, setSidebarCollapsed } = useUI();
    const spaces = useQuery(doc, SpaceTable, () => any(), [], 'content');
    const sortedSpaces = [...spaces].sort((a, b) => b.createdAt - a.createdAt);

    const handleCreateSpace = () => {
        const spaceId = crypto.randomUUID();
        upsert(doc, SpaceTable, {
            key: spaceId,
            title: '',
            createdAt: Date.now(),
        });
        navigate(`/space/${spaceId}`);
    };

    const handleToggle = () => {
        if (isOverlay) {
            setSidebarCollapsed(false);
        } else {
            setSidebarCollapsed(true);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <SidebarHeader
                isOverlay={isOverlay}
                sidebarCollapsed={sidebarCollapsed}
                onToggle={handleToggle}
            />

            <div className="flex-1 overflow-y-auto p-2">
                <div className="text-xs font-medium text-gray-500 uppercase px-2 py-1">
                    Spaces
                </div>

                <SpaceList
                    doc={doc}
                    spaces={sortedSpaces}
                    openSpace={openSpace}
                />
            </div>

            <div className="p-2 border-t border-gray-200">
                <button
                    type="button"
                    onClick={handleCreateSpace}
                    className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2"
                >
                    <span className="text-lg leading-none">+</span>
                    New Space
                </button>
            </div>

            <UserCard
                displayName={displayName}
                onOpenSettings={onOpenSettings}
            />
        </div>
    );
}

function SidebarHeader({
    isOverlay,
    sidebarCollapsed,
    onToggle,
}: {
    isOverlay: boolean;
    sidebarCollapsed: boolean;
    onToggle: () => void;
}) {
    return (
        <div className="p-3 border-b border-gray-200 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-800">Figments</h1>
            <button
                type="button"
                onClick={onToggle}
                className="p-1.5 rounded hover:bg-gray-200 text-gray-500 transition-colors"
                aria-label={
                    sidebarCollapsed ? 'Pin sidebar' : 'Collapse sidebar'
                }
            >
                <ChevronsLeftRight
                    className={`w-5 h-5 transition-transform ${isOverlay ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                />
            </button>
        </div>
    );
}

function SpaceList({
    doc,
    spaces,
    openSpace,
}: {
    doc: Y.Doc;
    spaces: Row<typeof SpaceTable>[];
    openSpace: string;
}) {
    const [renamingSpaceId, setRenamingSpaceId] = useState<string | null>(null);
    const [renamingTitle, setRenamingTitle] = useState('');
    const [deletingSpaceId, setDeletingSpaceId] = useState<string | null>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);

    useAutoFocus(!!renamingSpaceId, renameInputRef, true);

    const handleStartRenaming = (spaceId: string, currentTitle: string) => {
        setRenamingSpaceId(spaceId);
        setRenamingTitle(currentTitle);
    };

    const handleSaveRename = () => {
        if (!renamingSpaceId || !renamingTitle.trim()) {
            setRenamingSpaceId(null);
            return;
        }
        update(doc, SpaceTable, {
            key: renamingSpaceId,
            title: renamingTitle.trim(),
        });
        setRenamingSpaceId(null);
    };

    const handleCancelRename = () => {
        setRenamingSpaceId(null);
        setRenamingTitle('');
    };

    const handleConfirmDelete = () => {
        if (!deletingSpaceId) return;

        remove(doc, SpaceTable, deletingSpaceId);

        // If we're deleting the currently open space, navigate to home
        if (deletingSpaceId === openSpace) {
            navigate('/');
        }

        setDeletingSpaceId(null);
    };

    const handleCancelDelete = () => {
        setDeletingSpaceId(null);
    };

    const deletingSpace = deletingSpaceId
        ? spaces.find((s) => s.key === deletingSpaceId)
        : null;

    if (spaces.length === 0) {
        return (
            <div className="px-2 py-4 text-sm text-gray-400 italic">
                No spaces yet
            </div>
        );
    }

    return (
        <>
            {spaces.map((space) => (
                <div key={space.key} className="mb-1">
                    {renamingSpaceId === space.key ? (
                        <div className="px-2 py-1">
                            <input
                                ref={renameInputRef}
                                type="text"
                                value={renamingTitle}
                                onChange={(e) =>
                                    setRenamingTitle(e.target.value)
                                }
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveRename();
                                    if (e.key === 'Escape')
                                        handleCancelRename();
                                }}
                                onBlur={handleSaveRename}
                                className="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none"
                            />
                        </div>
                    ) : (
                        <Dropdown
                            trigger={
                                <Link
                                    href={`/space/${space.key}`}
                                    className={`
                                        w-full text-left px-3 py-2 rounded-lg text-sm
                                        transition-colors block
                                        ${
                                            space.key === openSpace
                                                ? 'bg-blue-100 text-blue-800 font-medium'
                                                : 'text-gray-700 hover:bg-gray-100'
                                        }
                                    `}
                                >
                                    {space.title || 'Untitled space'}
                                </Link>
                            }
                            triggerOnContextMenu
                            align="left"
                        >
                            <DropdownItem
                                onClick={() =>
                                    handleStartRenaming(space.key, space.title)
                                }
                            >
                                Rename
                            </DropdownItem>
                            <DropdownItem
                                onClick={() => setDeletingSpaceId(space.key)}
                            >
                                Delete
                            </DropdownItem>
                        </Dropdown>
                    )}
                </div>
            ))}

            {deletingSpace && (
                <ConfirmDialog
                    isOpen={!!deletingSpaceId}
                    onConfirm={handleConfirmDelete}
                    onCancel={handleCancelDelete}
                    title="Delete space?"
                    message={`Are you sure you want to delete "${deletingSpace.title}"?`}
                    confirmLabel="Delete"
                    confirmVariant="danger"
                />
            )}
        </>
    );
}

function UserCard({
    displayName,
    onOpenSettings,
}: {
    displayName: string;
    onOpenSettings: () => void;
}) {
    return (
        <div className="p-2 border-t border-gray-200">
            <Dropdown
                trigger={
                    <button
                        type="button"
                        className="w-full p-2 rounded-lg hover:bg-gray-100 flex items-center gap-3 transition-colors"
                    >
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-700">
                            {displayName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 text-left">
                            <div className="text-sm font-medium text-gray-800 truncate">
                                {displayName}
                            </div>
                        </div>
                    </button>
                }
                align="left"
                position="top"
            >
                <DropdownItem
                    onClick={onOpenSettings}
                    icon={<Settings className="w-full h-full" />}
                >
                    Settings
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem
                    onClick={() => {}}
                    destructive
                    icon={<LogOut className="w-full h-full" />}
                >
                    Sign out
                </DropdownItem>
            </Dropdown>
        </div>
    );
}
