import { createContext, useContext, useEffect, useState } from 'react';
import type * as Y from 'yjs';
import { useUser } from '@/context/user';
import { createHocuspocusConnection } from '@/sync/hocuspocus';
import { importUserPersonas } from '@/tables/persona';
import { ConversationView } from './conversation';

// biome-ignore lint/style/noNonNullAssertion: this context is never accessed outside useSpace, which throws if it is null
const SpaceContext = createContext<Y.Doc>(null!);

interface SpaceProps {
    id: string;
    initialFocusedNode: string | null;
    onFocusChange: (nodeId: string | null) => void;
}

export const Space = ({
    id,
    initialFocusedNode,
    onFocusChange,
}: SpaceProps) => {
    const { userDoc } = useUser();
    const [doc, setDoc] = useState<Y.Doc>();

    // When we first load or when open space changes, resync Yjs Doc
    useEffect(() => {
        if (!userDoc) return;

        // Clear doc while loading new space
        setDoc(undefined);

        const connection = createHocuspocusConnection({
            name: id,
            onSynced(doc) {
                // Sync user personas to space
                importUserPersonas(userDoc, doc);

                setDoc(doc); // Nothing to show we've synced space details, anyway
            },
        });

        return () => connection.destroy();
    }, [id, userDoc]);

    if (!userDoc || !doc) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500">
                Loading...
            </div>
        );
    }

    return (
        <SpaceContext.Provider value={doc}>
            <div className="flex flex-col h-full">
                <div className="flex-1 overflow-hidden">
                    <ConversationView
                        initialFocusedNode={initialFocusedNode}
                        onFocusChange={onFocusChange}
                    />
                </div>
            </div>
        </SpaceContext.Provider>
    );
};

export function useSpace() {
    const doc = useContext(SpaceContext);
    if (!doc) {
        throw new Error('call to useSpace() outside <Space>!');
    }
    return doc;
}
