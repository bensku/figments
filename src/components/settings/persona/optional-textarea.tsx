import type { RefObject } from 'react';
import { cn } from '@/utils/cn';

interface OptionalTextareaFieldProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    onAdjustHeight: () => void;
    isVisible: boolean;
    onShow: () => void;
    onRemove: () => void;
    isReadOnly: boolean;
    placeholder: string;
    textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export function OptionalTextareaField({
    id,
    label,
    value,
    onChange,
    onAdjustHeight,
    isVisible,
    onShow,
    onRemove,
    isReadOnly,
    placeholder,
    textareaRef,
}: OptionalTextareaFieldProps) {
    if (!isVisible && !isReadOnly) {
        return (
            <button
                type="button"
                onClick={onShow}
                className="block text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
                + Add {label}
            </button>
        );
    }

    if (!isVisible) {
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
                {!isReadOnly && (
                    <button
                        type="button"
                        onClick={onRemove}
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
                    onAdjustHeight();
                }}
                disabled={isReadOnly}
                placeholder={placeholder}
                rows={2}
                className={cn(
                    'w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                    'resize-none overflow-hidden',
                    isReadOnly && 'bg-gray-100 text-gray-500',
                )}
            />
        </div>
    );
}
