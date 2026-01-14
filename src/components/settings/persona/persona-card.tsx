import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import type { Persona } from '@/tables/persona';
import { sourceBadgeStyles, sourceLabels } from './constants';

export type PersonaSource = 'instance' | 'user' | 'space';

interface PersonaCardProps {
    persona: Persona;
    source: PersonaSource;
    onEdit?: () => void;
    onDelete?: () => void;
    onClone?: () => void;
    onImport?: () => void;
    isSyncedToSpace?: boolean;
    isOutdated?: boolean;
    canImport?: boolean;
}

export function PersonaCard({
    persona,
    source,
    onEdit,
    onDelete,
    onClone,
    onImport,
    isSyncedToSpace,
    isOutdated,
    canImport,
}: PersonaCardProps) {
    const handleCardClick = (e: React.MouseEvent) => {
        // Only trigger edit if the click was on the card itself, not on action buttons
        if (
            e.target === e.currentTarget ||
            !(e.target as HTMLElement).closest('button')
        ) {
            onEdit?.();
        }
    };

    return (
        // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard accessible via action buttons
        // biome-ignore lint/a11y/useSemanticElements: this is a card component, not a form fieldset
        <div
            className="relative flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer w-full"
            onClick={handleCardClick}
            role="group"
        >
            <div className="flex items-center gap-3 min-w-0 flex-1 pointer-events-none">
                <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-gray-900 truncate min-w-0">
                            {persona.title}
                        </span>
                        <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${sourceBadgeStyles[source]}`}
                        >
                            {sourceLabels[source]}
                        </span>
                        {source === 'user' && isSyncedToSpace && (
                            <span className="pointer-events-auto flex-shrink-0">
                                {isOutdated ? (
                                    <span
                                        title="Out of sync - import to update"
                                        className="text-red-500"
                                    >
                                        <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            aria-hidden="true"
                                        >
                                            <circle cx="12" cy="12" r="10" />
                                            <line
                                                x1="12"
                                                y1="8"
                                                x2="12"
                                                y2="12"
                                            />
                                            <line
                                                x1="12"
                                                y1="16"
                                                x2="12.01"
                                                y2="16"
                                            />
                                        </svg>
                                    </span>
                                ) : persona.importByDefault ? (
                                    <span
                                        title="Auto-sync enabled"
                                        className="text-green-500"
                                    >
                                        <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            aria-hidden="true"
                                        >
                                            <path d="M23 4v6h-6" />
                                            <path d="M1 20v-6h6" />
                                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                                        </svg>
                                    </span>
                                ) : (
                                    <span
                                        title="Synced to space"
                                        className="text-green-500"
                                    >
                                        <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            aria-hidden="true"
                                        >
                                            <path d="M20 6L9 17l-5-5" />
                                        </svg>
                                    </span>
                                )}
                            </span>
                        )}
                    </div>
                    {persona.systemPrompt && (
                        <p className="text-sm text-gray-500 line-clamp-2 min-w-0 mt-0.5">
                            {persona.systemPrompt}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1 pointer-events-auto flex-shrink-0">
                {onImport && canImport && (
                    <button
                        type="button"
                        onClick={onImport}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Import to Space"
                        aria-label="Import to Space"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                    </button>
                )}
                {onClone && (
                    <button
                        type="button"
                        onClick={onClone}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Clone"
                        aria-label="Clone preset"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <rect
                                x="9"
                                y="9"
                                width="13"
                                height="13"
                                rx="2"
                                ry="2"
                            />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                    </button>
                )}
                {onDelete && (
                    <Dropdown
                        trigger={
                            <button
                                type="button"
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                aria-label="More actions"
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <circle cx="12" cy="12" r="1" />
                                    <circle cx="12" cy="5" r="1" />
                                    <circle cx="12" cy="19" r="1" />
                                </svg>
                            </button>
                        }
                        align="right"
                    >
                        <DropdownItem onClick={onDelete} destructive>
                            {source === 'user' && isSyncedToSpace
                                ? 'Unlink from Space'
                                : 'Delete'}
                        </DropdownItem>
                    </Dropdown>
                )}
            </div>
        </div>
    );
}
