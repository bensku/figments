import { any, upsert } from '@bensku/y-query';
import { useQuery } from '@bensku/y-query-react';
import { useEffect, useRef, useState } from 'react';
import type * as Y from 'yjs';
import {
    Dropdown,
    DropdownItem,
    DropdownSeparator,
} from '@/components/ui/Dropdown';
import { useUI } from '@/context/ui';
import { useUser } from '@/context/user';
import { SpaceTable } from '@/tables/user';

export const Sidebar = ({
    openSpace,
    onOpenSpace,
}: {
    openSpace: string;
    onOpenSpace: (spaceId: string) => void;
}) => {
    const { displayName, userDoc } = useUser();
    const { sidebarCollapsed } = useUI();
    const [isHovered, setIsHovered] = useState(false);

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
                            onOpenSpace={onOpenSpace}
                            isOverlay={isOverlay}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

function SidebarContent({
    doc,
    displayName,
    openSpace,
    onOpenSpace,
    isOverlay,
}: {
    doc: Y.Doc;
    displayName: string;
    openSpace: string;
    onOpenSpace: (spaceId: string) => void;
    isOverlay: boolean;
}) {
    const { sidebarCollapsed, setSidebarCollapsed } = useUI();
    const spaces = useQuery(doc, SpaceTable, () => any(), [], 'content');
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Renaming state for space names
    const [renamingSpaceId, setRenamingSpaceId] = useState<string | null>(null);
    const [renamingTitle, setRenamingTitle] = useState('');
    const renameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isCreating && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isCreating]);

    useEffect(() => {
        if (renamingSpaceId && renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
        }
    }, [renamingSpaceId]);

    const handleStartRenaming = (spaceId: string, currentTitle: string) => {
        setRenamingSpaceId(spaceId);
        setRenamingTitle(currentTitle);
    };

    const handleSaveRename = () => {
        if (!renamingSpaceId || !renamingTitle.trim()) {
            setRenamingSpaceId(null);
            return;
        }

        upsert(doc, SpaceTable, {
            key: renamingSpaceId,
            spaceId: renamingSpaceId,
            title: renamingTitle.trim(),
        });

        setRenamingSpaceId(null);
    };

    const handleCancelRename = () => {
        setRenamingSpaceId(null);
        setRenamingTitle('');
    };

    const handleCreateSpace = () => {
        if (!newTitle.trim()) return;

        const spaceId = crypto.randomUUID();
        upsert(doc, SpaceTable, {
            key: spaceId,
            spaceId,
            title: newTitle.trim(),
        });

        setNewTitle('');
        setIsCreating(false);
        onOpenSpace(spaceId);
    };

    // Toggle behavior: when in overlay mode, clicking expands (un-collapses);
    // when expanded, clicking collapses
    const handleToggle = () => {
        if (isOverlay) {
            // Currently showing as overlay, make it permanent
            setSidebarCollapsed(false);
        } else {
            // Currently expanded, collapse it
            setSidebarCollapsed(true);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                <h1 className="text-lg font-semibold text-gray-800">
                    Figments
                </h1>
                <button
                    type="button"
                    onClick={handleToggle}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-500 transition-colors"
                    aria-label={
                        sidebarCollapsed ? 'Pin sidebar' : 'Collapse sidebar'
                    }
                >
                    <svg
                        className={`w-5 h-5 transition-transform ${isOverlay ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                        />
                    </svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                <div className="text-xs font-medium text-gray-500 uppercase px-2 py-1">
                    Spaces
                </div>

                {spaces.length === 0 && !isCreating && (
                    <div className="px-2 py-4 text-sm text-gray-400 italic">
                        No spaces yet
                    </div>
                )}

                {spaces.map((space) => (
                    <div key={space.key} className="mb-1">
                        {renamingSpaceId === space.spaceId ? (
                            <div className="px-2 py-1">
                                <input
                                    ref={renameInputRef}
                                    type="text"
                                    value={renamingTitle}
                                    onChange={(e) =>
                                        setRenamingTitle(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter')
                                            handleSaveRename();
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
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onOpenSpace(space.spaceId)
                                        }
                                        className={`
                                            w-full text-left px-3 py-2 rounded-lg text-sm
                                            transition-colors
                                            ${
                                                space.spaceId === openSpace
                                                    ? 'bg-blue-100 text-blue-800 font-medium'
                                                    : 'text-gray-700 hover:bg-gray-100'
                                            }
                                        `}
                                    >
                                        {space.title}
                                    </button>
                                }
                                triggerOnContextMenu
                                align="left"
                            >
                                <DropdownItem
                                    onClick={() =>
                                        handleStartRenaming(
                                            space.spaceId,
                                            space.title,
                                        )
                                    }
                                >
                                    Rename
                                </DropdownItem>
                            </Dropdown>
                        )}
                    </div>
                ))}

                {isCreating && (
                    <div className="px-2 py-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreateSpace();
                                if (e.key === 'Escape') {
                                    setIsCreating(false);
                                    setNewTitle('');
                                }
                            }}
                            placeholder="Space name..."
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                        />
                        <div className="flex gap-1 mt-1">
                            <button
                                type="button"
                                onClick={handleCreateSpace}
                                className="flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Create
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCreating(false);
                                    setNewTitle('');
                                }}
                                className="flex-1 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-2 border-t border-gray-200">
                <button
                    type="button"
                    onClick={() => setIsCreating(true)}
                    className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2"
                >
                    <span className="text-lg leading-none">+</span>
                    New Space
                </button>
            </div>

            {/* User card */}
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
                    <DropdownItem onClick={() => {}}>Settings</DropdownItem>
                    <DropdownSeparator />
                    <DropdownItem onClick={() => {}} destructive>
                        Sign out
                    </DropdownItem>
                </Dropdown>
            </div>
        </div>
    );
}
