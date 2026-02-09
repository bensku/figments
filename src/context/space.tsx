import type { HocuspocusProvider } from '@hocuspocus/provider';
import {
    createContext,
    type ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';
import type * as Y from 'yjs';
import { createHocuspocusConnection } from '@/sync/hocuspocus';
import { importUserPersonas } from '@/tables/persona';
import { useShareToken } from './share-token';
import { useOptionalUser } from './user';

interface SpaceContextValue {
    spaceId: string | null;
    spaceDoc: Y.Doc | null;
    provider: HocuspocusProvider | null;
    readOnly: boolean;
}

const SpaceContext = createContext<SpaceContextValue | null>(null);

interface SpaceProviderProps {
    spaceId: string | null;
    /** Owner user ID - required for shared spaces where the viewer is not the owner */
    ownerUserId?: string;
    userDoc: Y.Doc | null;
    children: ReactNode;
}

export function SpaceProvider({
    spaceId,
    ownerUserId,
    children,
}: SpaceProviderProps) {
    const user = useOptionalUser();
    const userDoc = user?.userDoc ?? null;
    const shareToken = useShareToken();

    // For shared spaces, use the owner's userId; otherwise use the current user's
    const userId = ownerUserId ?? user?.userId;

    const [spaceDoc, setSpaceDoc] = useState<Y.Doc | null>(null);
    const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
    const [readOnly, setReadOnly] = useState(false);

    useEffect(() => {
        // Clear doc and provider while loading new space
        setSpaceDoc(null);
        setProvider(null);
        setReadOnly(false);

        if (!spaceId || !userId) {
            return;
        }

        // For normal (non-shared) spaces, wait for userDoc to be ready
        if (!shareToken && !userDoc) {
            return;
        }

        const connection = createHocuspocusConnection({
            name: `${userId}/${spaceId}`,
            shareToken: shareToken ?? undefined,
            onSynced(doc) {
                // Sync user personas to space (only for authenticated users with their own doc)
                if (userDoc) {
                    importUserPersonas(userDoc, doc);
                }
                setSpaceDoc(doc);
            },
            onAuthenticated(scope) {
                setReadOnly(scope === 'readonly');
            },
        });

        setProvider(connection.provider);

        return () => connection.destroy();
    }, [spaceId, userDoc, userId, shareToken]);

    return (
        <SpaceContext.Provider
            value={{ spaceId, spaceDoc, provider, readOnly }}
        >
            {children}
        </SpaceContext.Provider>
    );
}

export function useSpace() {
    const context = useContext(SpaceContext);
    if (!context) {
        throw new Error('useSpace must be used within a SpaceProvider');
    }
    return context;
}

export function useSpaceDoc() {
    const { spaceDoc } = useSpace();
    if (!spaceDoc) {
        throw new Error('Space doc not yet loaded');
    }
    return spaceDoc;
}
