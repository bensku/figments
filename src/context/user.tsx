import { HocuspocusProvider } from '@hocuspocus/provider';
import {
    createContext,
    type ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';
import * as Y from 'yjs';

interface UserContextValue {
    userId: string;
    displayName: string;
    userDoc: Y.Doc | null;
}

const UserContext = createContext<UserContextValue | null>(null);

interface UserProviderProps {
    userId: string;
    displayName: string;
    children: ReactNode;
}

export function UserProvider({
    userId,
    displayName,
    children,
}: UserProviderProps) {
    const [userDoc, setUserDoc] = useState<Y.Doc | null>(null);

    useEffect(() => {
        const document = new Y.Doc();
        const provider = new HocuspocusProvider({
            url: `ws://${location.hostname}:${location.port}/ws`,
            name: `user.${userId}`,
            document,
            onAuthenticationFailed: () => location.reload(),
            onClose: ({ event }) => {
                // Hocuspocus uses 4401 (Unauthorized) and 4403 (Forbidden)
                if (event.code === 4401 || event.code === 4403) {
                    location.reload();
                }
            },
        });
        setUserDoc(document);

        return () => {
            provider.destroy();
            document.destroy();
        };
    }, [userId]);

    return (
        <UserContext.Provider value={{ userId, displayName, userDoc }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}

export function useUserDoc() {
    const { userDoc } = useUser();
    if (!userDoc) {
        throw new Error('User doc not yet loaded');
    }
    return userDoc;
}
