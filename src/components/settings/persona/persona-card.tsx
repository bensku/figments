import {
    AlertCircle,
    Check,
    Copy,
    Download,
    MoreVertical,
    RefreshCw,
} from 'lucide-react';
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
                                        <AlertCircle
                                            width="14"
                                            height="14"
                                            aria-hidden="true"
                                        />
                                    </span>
                                ) : persona.importByDefault ? (
                                    <span
                                        title="Auto-sync enabled"
                                        className="text-green-500"
                                    >
                                        <RefreshCw
                                            width="14"
                                            height="14"
                                            aria-hidden="true"
                                        />
                                    </span>
                                ) : (
                                    <span
                                        title="Synced to space"
                                        className="text-green-500"
                                    >
                                        <Check
                                            width="14"
                                            height="14"
                                            aria-hidden="true"
                                        />
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
                        <Download width="16" height="16" aria-hidden="true" />
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
                        <Copy width="16" height="16" aria-hidden="true" />
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
                                <MoreVertical
                                    width="16"
                                    height="16"
                                    aria-hidden="true"
                                />
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
