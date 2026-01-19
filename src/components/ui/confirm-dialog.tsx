import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmVariant?: 'danger' | 'primary';
}

export function ConfirmDialog({
    isOpen,
    onConfirm,
    onCancel,
    title,
    message,
    confirmLabel = 'Confirm',
    confirmVariant = 'danger',
}: ConfirmDialogProps) {
    const confirmButtonRef = useRef<HTMLButtonElement>(null);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onCancel();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onCancel]);

    // Focus confirm button when opened
    useEffect(() => {
        if (isOpen && confirmButtonRef.current) {
            confirmButtonRef.current.focus();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleBackdropClick = (event: React.MouseEvent) => {
        if (event.target === event.currentTarget) {
            onCancel();
        }
    };

    const confirmButtonStyles =
        confirmVariant === 'danger'
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white';

    return (
        // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click-to-close is intentional
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={handleBackdropClick}
            onKeyDown={() => {}}
            role="presentation"
        >
            <div
                className="max-w-sm w-full mx-4 bg-white rounded-lg shadow-xl p-6"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-message"
            >
                <h2
                    id="confirm-dialog-title"
                    className="text-lg font-semibold text-gray-900 mb-2"
                >
                    {title}
                </h2>
                <p
                    id="confirm-dialog-message"
                    className="text-sm text-gray-600 mb-6"
                >
                    {message}
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        ref={confirmButtonRef}
                        type="button"
                        onClick={onConfirm}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${confirmButtonStyles}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
