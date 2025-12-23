import { type ReactNode, useEffect, useRef, useState } from 'react';

interface DropdownProps {
    trigger: ReactNode;
    children: ReactNode;
    align?: 'left' | 'right';
    position?: 'bottom' | 'top';
    triggerOnContextMenu?: boolean;
}

export function Dropdown({
    trigger,
    children,
    align = 'right',
    position = 'bottom',
    triggerOnContextMenu = false,
}: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const handleContextMenu = (e: React.MouseEvent) => {
        if (triggerOnContextMenu) {
            e.preventDefault();
            setIsOpen(!isOpen);
        }
    };

    return (
        <div ref={dropdownRef} className="relative">
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: trigger element handles keyboard events */}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: wrapper delegates to interactive trigger */}
            <span
                onClick={
                    triggerOnContextMenu ? undefined : () => setIsOpen(!isOpen)
                }
                onContextMenu={handleContextMenu}
                className="contents"
            >
                {trigger}
            </span>
            {isOpen && (
                <div
                    className={`
                        absolute py-1 bg-white rounded-lg shadow-lg
                        border border-gray-200 min-w-[160px] z-50 animate-scale-in
                        ${position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'}
                        ${align === 'right' ? 'right-0' : 'left-0'}
                    `}
                >
                    {children}
                </div>
            )}
        </div>
    );
}

interface DropdownItemProps {
    onClick?: () => void;
    children: ReactNode;
    destructive?: boolean;
}

export function DropdownItem({
    onClick,
    children,
    destructive = false,
}: DropdownItemProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                w-full text-left px-3 py-2 text-sm transition-colors
                ${
                    destructive
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-gray-700 hover:bg-gray-100'
                }
            `}
        >
            {children}
        </button>
    );
}

export function DropdownSeparator() {
    return <div className="my-1 border-t border-gray-200" />;
}
