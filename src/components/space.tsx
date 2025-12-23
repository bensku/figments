import { createContext, useContext, useEffect, useState } from 'react';
import type * as Y from 'yjs';
import { createHocuspocusConnection } from '@/sync/hocuspocus';
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
    const [doc, setDoc] = useState<Y.Doc>();

    // When we first load or when open space changes, resync Yjs Doc
    useEffect(() => {
        // Clear doc while loading new space
        setDoc(undefined);

        const connection = createHocuspocusConnection({
            name: id,
            onSynced(doc) {
                setDoc(doc); // Nothing to show before this is done, anyway
            },
        });

        return () => connection.destroy();
    }, [id]);

    if (!doc) {
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
