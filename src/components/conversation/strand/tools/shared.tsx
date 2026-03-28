import { ChevronRight } from 'lucide-react';
import { type ReactNode, useState } from 'react';

// Renderer types

export type ToolCallRenderer = (props: {
    input: unknown;
    result?: unknown;
}) => React.ReactNode;

export type ToolResultRenderer = (props: {
    output: unknown;
}) => React.ReactNode;

// Shared components

export function ToolExpandButton({
    expanded,
    onToggle,
    canExpand = true,
    children,
}: {
    expanded: boolean;
    onToggle: () => void;
    canExpand?: boolean;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                if (canExpand) {
                    onToggle();
                }
            }}
            className={`inline-flex items-center gap-1 text-amber-700 max-w-full whitespace-nowrap ${canExpand ? 'hover:text-amber-800 transition-colors hover:[text-shadow:_0_0_8px_rgb(217_119_6_/_0.4)]' : ''}`}
        >
            {canExpand && (
                <ChevronRight
                    className={`w-3 h-3 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
                    fill="currentColor"
                    aria-hidden="true"
                />
            )}
            {children}
        </button>
    );
}

export function ToolExpandPanel({ children }: { children: ReactNode }) {
    return (
        <div className="mt-2 pl-4 border-l-2 border-gray-200 space-y-1">
            {children}
        </div>
    );
}

export interface UrlResultItem {
    url: string;
    title?: string | null;
    date?: string | null;
}

export function UrlResultList({ items }: { items: UrlResultItem[] }) {
    return (
        <>
            {items.map((item) => (
                <div
                    key={item.url}
                    className="text-xs flex items-baseline gap-2"
                >
                    <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-700 hover:text-gray-900 hover:underline truncate flex-1 min-w-0"
                        title={item.title ?? item.url}
                    >
                        {item.title ?? item.url}
                    </a>
                    {item.date && (
                        <span className="text-gray-400 whitespace-nowrap flex-shrink-0">
                            {item.date}
                        </span>
                    )}
                </div>
            ))}
        </>
    );
}

/**
 * Safely extracts a hostname from a URL string.
 */
export function extractHostname(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

/**
 * Formats a character count for display (e.g., "12.4k chars").
 */
export function formatCharCount(count: number): string {
    if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}k chars`;
    }
    return `${count} chars`;
}

/**
 * Hook for expandable tool renderer state.
 */
export function useToolExpand(canExpand = true) {
    const [expanded, setExpanded] = useState(false);
    const toggle = () => {
        if (canExpand) setExpanded(!expanded);
    };
    return { expanded, toggle } as const;
}
