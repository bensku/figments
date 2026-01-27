import { useEffect, useRef } from 'react';

interface DemoWarningDialogProps {
    isOpen: boolean;
    onAccept: () => void;
}

export function DemoWarningDialog({
    isOpen,
    onAccept,
}: DemoWarningDialogProps) {
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Prevent body scroll when dialog is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Focus the button when dialog opens
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            buttonRef.current.focus();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            role="presentation"
        >
            <div
                className="max-w-md w-full mx-4 bg-white rounded-lg shadow-xl p-6"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="demo-warning-title"
                aria-describedby="demo-warning-description"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <svg
                            className="w-5 h-5 text-amber-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                    <h2
                        id="demo-warning-title"
                        className="text-lg font-semibold text-gray-900"
                    >
                        Demo Instance
                    </h2>
                </div>

                <div id="demo-warning-description" className="space-y-3 mb-6">
                    <p className="text-sm text-gray-600">
                        You are about to access a <strong>demo instance</strong>{' '}
                        of Figments.
                    </p>
                    <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                        <li>
                            <strong>
                                Do not enter any confidential information!
                            </strong>
                        </li>
                        <li>
                            Data may be deleted or reset at any time without
                            notice.
                        </li>
                        <li>
                            Your demo session will expire in{' '}
                            <strong>30 days</strong>.
                        </li>
                    </ul>
                </div>

                <button
                    ref={buttonRef}
                    type="button"
                    onClick={onAccept}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    I understand, continue
                </button>
            </div>
        </div>
    );
}
