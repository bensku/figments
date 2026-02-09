import { createContext, type ReactNode, useContext } from 'react';

interface ShareTokenContextValue {
    /** The full share token string (userId.spaceId.token) for WebSocket auth */
    shareToken: string;
}

const ShareTokenContext = createContext<ShareTokenContextValue | null>(null);

interface ShareTokenProviderProps {
    shareToken: string;
    children: ReactNode;
}

/**
 * Provides the share token to descendant components.
 * Used when viewing a shared space so that SpaceProvider can pass
 * the token to the Hocuspocus WebSocket connection.
 */
export function ShareTokenProvider({
    shareToken,
    children,
}: ShareTokenProviderProps) {
    return (
        <ShareTokenContext.Provider value={{ shareToken }}>
            {children}
        </ShareTokenContext.Provider>
    );
}

/**
 * Returns the share token if viewing a shared space, or null if not.
 */
export function useShareToken(): string | null {
    const context = useContext(ShareTokenContext);
    return context?.shareToken ?? null;
}
