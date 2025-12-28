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

interface SpaceContextValue {
    spaceId: string | null;
    spaceDoc: Y.Doc | null;
}

const SpaceContext = createContext<SpaceContextValue | null>(null);

interface SpaceProviderProps {
    spaceId: string | null;
    userDoc: Y.Doc | null;
    children: ReactNode;
}

export function SpaceProvider({
    spaceId,
    userDoc,
    children,
}: SpaceProviderProps) {
    const [spaceDoc, setSpaceDoc] = useState<Y.Doc | null>(null);

    useEffect(() => {
        if (!spaceId || !userDoc) {
            setSpaceDoc(null);
            return;
        }

        // Clear doc while loading new space
        setSpaceDoc(null);

        const connection = createHocuspocusConnection({
            name: spaceId,
            onSynced(doc) {
                // Sync user personas to space
                importUserPersonas(userDoc, doc);
                setSpaceDoc(doc);
            },
        });

        return () => connection.destroy();
    }, [spaceId, userDoc]);

    return (
        <SpaceContext.Provider value={{ spaceId, spaceDoc }}>
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
