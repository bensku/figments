import { any, select, upsert } from '@bensku/y-query';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { createContext, useContext, useEffect, useState } from 'react';
import * as Y from 'yjs';
import { DEFAULT_PERSONAS, PersonaTable } from '@/tables/persona';
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

        const document = new Y.Doc();
        const provider = new HocuspocusProvider({
            url: `ws://${location.hostname}:${location.port}/ws`,
            name: id,
            document,
            onSynced() {
                // Add default personas if space has none
                const existingPersonas = select(document, PersonaTable, any());
                if (existingPersonas.length === 0) {
                    for (const persona of DEFAULT_PERSONAS) {
                        upsert(document, PersonaTable, persona);
                    }
                }
                // Only expose doc after sync to prevent creating duplicate drafts
                setDoc(document);
            },
            onAuthenticationFailed: () => location.reload(),
            onClose: ({ event }) => {
                // Hocuspocus uses 4401 (Unauthorized) and 4403 (Forbidden)
                if (event.code === 4401 || event.code === 4403) {
                    location.reload();
                }
            },
        });

        return () => {
            provider.destroy();
        };
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
