import type { ReactNode } from 'react';

export function EmptyState({
    message,
    secondaryMessage,
    children,
}: {
    message: string;
    secondaryMessage?: string;
    children?: ReactNode;
}) {
    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500 py-8">
                    <p className="text-lg mb-2">{message}</p>
                    {secondaryMessage && (
                        <p className="text-sm">{secondaryMessage}</p>
                    )}
                </div>
            </div>
            {children}
        </div>
    );
}
