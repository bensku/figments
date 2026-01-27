import { useCallback, useEffect, useState } from 'react';
import { getCookie, setCookie } from '@/utils/cookies';

const DEMO_TOKEN_COOKIE = 'demoToken';
const DEMO_USER_ID_COOKIE = 'demoUserId';
const DEMO_TOKEN_PARAM = 'demoToken';
const COOKIE_EXPIRY_DAYS = 30;

interface UseDemoAuthResult {
    /**
     * Whether the demo warning modal needs to be shown.
     */
    needsAcknowledgment: boolean;

    /**
     * Whether we're still checking for demo auth state.
     */
    isLoading: boolean;

    /**
     * Called when user accepts the demo warning.
     * Sets cookies, clears URL param, and reloads.
     */
    handleAccept: () => void;
}

export function useDemoAuth(): UseDemoAuthResult {
    const [needsAcknowledgment, setNeedsAcknowledgment] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [demoToken, setDemoToken] = useState<string | null>(null);

    useEffect(() => {
        async function checkDemoAuth() {
            // Check for demoToken in URL
            const urlParams = new URLSearchParams(window.location.search);
            const tokenFromUrl = urlParams.get(DEMO_TOKEN_PARAM);

            if (!tokenFromUrl) {
                // No demo token in URL, nothing to do
                setIsLoading(false);
                return;
            }

            // Check if valid cookies already exist
            const [existingToken, existingUserId] = await Promise.all([
                getCookie(DEMO_TOKEN_COOKIE),
                getCookie(DEMO_USER_ID_COOKIE),
            ]);

            if (existingToken && existingUserId) {
                // Cookies are valid, just clear the URL param and continue
                clearDemoTokenFromUrl();
                setIsLoading(false);
                return;
            }

            // Need to show the warning dialog
            setDemoToken(tokenFromUrl);
            setNeedsAcknowledgment(true);
            setIsLoading(false);
        }

        checkDemoAuth();
    }, []);

    const handleAccept = useCallback(async () => {
        if (!demoToken) return;

        // Generate random user ID
        const userId = crypto.randomUUID();

        // Set cookies with 30-day expiry
        await Promise.all([
            setCookie(DEMO_TOKEN_COOKIE, demoToken, COOKIE_EXPIRY_DAYS),
            setCookie(DEMO_USER_ID_COOKIE, userId, COOKIE_EXPIRY_DAYS),
        ]);

        // Clear URL param
        clearDemoTokenFromUrl();

        // Reload to let normal auth flow pick up the cookies
        window.location.reload();
    }, [demoToken]);

    return {
        needsAcknowledgment,
        isLoading,
        handleAccept,
    };
}

function clearDemoTokenFromUrl(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete(DEMO_TOKEN_PARAM);

    // Use replaceState to update URL without adding to history
    window.history.replaceState({}, '', url.toString());
}
