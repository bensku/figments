import { useState, type ReactNode } from 'react';

interface TooltipProps {
    content: string;
    children: ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
    delay?: number;
}

export function Tooltip({
    content,
    children,
    side = 'right',
    delay = 200,
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [timeoutId, setTimeoutId] = useState<ReturnType<
        typeof setTimeout
    > | null>(null);

    const showTooltip = () => {
        const id = setTimeout(() => setIsVisible(true), delay);
        setTimeoutId(id);
    };

    const hideTooltip = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            setTimeoutId(null);
        }
        setIsVisible(false);
    };

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    };

    return (
        // biome-ignore lint/a11y/noStaticElementInteractions: Tooltip wrapper needs hover detection
        <div
            className="relative inline-flex"
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
        >
            {children}
            {isVisible && (
                <div
                    className={`
                        absolute z-50 px-2 py-1 text-sm text-white bg-gray-800
                        rounded shadow-lg whitespace-nowrap pointer-events-none
                        ${positionClasses[side]}
                    `}
                    role="tooltip"
                >
                    {content}
                </div>
            )}
        </div>
    );
}
