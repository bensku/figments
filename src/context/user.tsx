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
    userDoc: Y.Doc | null;
}

const UserContext = createContext<UserContextValue | null>(null);

interface UserProviderProps {
    userId: string;
    children: ReactNode;
}

export function UserProvider({ userId, children }: UserProviderProps) {
    const [userDoc, setUserDoc] = useState<Y.Doc | null>(null);

    useEffect(() => {
        const document = new Y.Doc();
        new HocuspocusProvider({
            url: `ws://${location.hostname}:${location.port}/ws`,
            name: `user.${userId}`,
            document,
        });
        setUserDoc(document);

        return () => {
            document.destroy();
        };
    }, [userId]);

    return (
        <UserContext.Provider value={{ userId, userDoc }}>
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
