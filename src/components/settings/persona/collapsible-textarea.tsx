import type { RefObject } from 'react';
import { cn } from '@/utils/cn';

interface CollapsibleTextareaProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    description?: string;
    disabled?: boolean;
    isExpanded: boolean;
    onExpand: () => void;
    onCollapse: () => void;
    textareaRef?: RefObject<HTMLTextAreaElement | null>;
    onAdjustHeight?: () => void;
}

export function CollapsibleTextarea({
    id,
    label,
    value,
    onChange,
    placeholder,
    description,
    disabled = false,
    isExpanded,
    onExpand,
    onCollapse,
    textareaRef,
    onAdjustHeight,
}: CollapsibleTextareaProps) {
    // Show "+ Add" button when collapsed (for editable fields)
    if (!isExpanded && !disabled) {
        return (
            <button
                type="button"
                onClick={onExpand}
                className="block text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
                + Add {label}
            </button>
        );
    }

    // Hide completely when collapsed in read-only mode
    if (!isExpanded) {
        return null;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <label
                    htmlFor={id}
                    className="block text-xs font-medium text-gray-700"
                >
                    {label}
                </label>
                {!disabled && (
                    <button
                        type="button"
                        onClick={onCollapse}
                        className="text-xs text-gray-500 hover:text-gray-700"
                    >
                        Remove
                    </button>
                )}
            </div>
            <textarea
                ref={textareaRef}
                id={id}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    onAdjustHeight?.();
                }}
                disabled={disabled}
                placeholder={placeholder}
                rows={2}
                className={cn(
                    'w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                    'resize-none overflow-hidden placeholder:text-gray-400',
                    disabled && 'bg-gray-100 text-gray-500',
                )}
            />
            {description && (
                <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
        </div>
    );
}
