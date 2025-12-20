import { HocuspocusProvider } from '@hocuspocus/provider';
import { any, select, upsert } from '@bensku/y-query';
import { createContext, useContext, useEffect, useState } from 'react';
import * as Y from 'yjs';
import { ConversationView } from './conversation';
import { DEFAULT_PERSONAS, PersonaTable } from '@/tables/persona';

// biome-ignore lint/style/noNonNullAssertion: this context is never accessed outside useSpace, which throws if it is null
const SpaceContext = createContext<Y.Doc>(null!);

export const Space = ({ id }: { id: string }) => {
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
                    <ConversationView />
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
