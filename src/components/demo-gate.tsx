import type { ReactNode } from 'react';
import { useDemoAuth } from '@/hooks/useDemoAuth';
import { DemoWarningDialog } from './ui/demo-warning-dialog';

interface DemoGateProps {
    children: ReactNode;
}

/**
 * Gate component that handles demo authentication flow.
 *
 * When a user visits with ?demoToken=xxx in the URL:
 * - If valid demo cookies already exist, clears URL param and renders children
 * - If not, shows a warning dialog that user must acknowledge before proceeding
 *
 * When no demo token is in the URL, renders children normally.
 */
export function DemoGate({ children }: DemoGateProps) {
    const { needsAcknowledgment, isLoading, handleAccept } = useDemoAuth();

    // Show loading state while checking demo auth
    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center text-gray-400">
                Loading...
            </div>
        );
    }

    // Show warning dialog if user needs to acknowledge demo mode
    if (needsAcknowledgment) {
        return (
            <>
                <div className="h-screen flex items-center justify-center text-gray-400">
                    Loading...
                </div>
                <DemoWarningDialog isOpen={true} onAccept={handleAccept} />
            </>
        );
    }

    // Render children normally
    return <>{children}</>;
}
