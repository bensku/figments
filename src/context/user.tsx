import {
    createContext,
    type ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';
import type * as Y from 'yjs';
import { createHocuspocusConnection } from '@/sync/hocuspocus';

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
        const connection = createHocuspocusConnection({
            name: `user.${userId}`,
        });
        setUserDoc(connection.doc);

        return () => connection.destroy();
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
