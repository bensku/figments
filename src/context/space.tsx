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
import { useUser } from './user';

interface SpaceContextValue {
    spaceId: string | null;
    spaceDoc: Y.Doc | null;
    provider: HocuspocusProvider | null;
}

const SpaceContext = createContext<SpaceContextValue | null>(null);

interface SpaceProviderProps {
    spaceId: string | null;
    userDoc: Y.Doc | null;
    children: ReactNode;
}

export function SpaceProvider({ spaceId, children }: SpaceProviderProps) {
    const user = useUser();
    const userDoc = user.userDoc;

    const [spaceDoc, setSpaceDoc] = useState<Y.Doc | null>(null);
    const [provider, setProvider] = useState<HocuspocusProvider | null>(null);

    useEffect(() => {
        // Clear doc and provider while loading new space
        setSpaceDoc(null);
        setProvider(null);

        if (!spaceId || !userDoc) {
            return;
        }

        const connection = createHocuspocusConnection({
            name: `${user.userId}/${spaceId}`,
            onSynced(doc) {
                // Sync user personas to space
                importUserPersonas(userDoc, doc);
                setSpaceDoc(doc);
            },
        });

        setProvider(connection.provider);

        return () => connection.destroy();
    }, [spaceId, userDoc, user.userId]);

    return (
        <SpaceContext.Provider value={{ spaceId, spaceDoc, provider }}>
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
