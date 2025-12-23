import { useEffect, useState } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import './index.css';
import type { User } from './auth/user';
import { Sidebar } from './components/sidebar';
import { Space } from './components/space';
import { UIProvider } from './context/ui';
import { UserProvider } from './context/user';
import { ViewProvider } from './context/view';

export const App = () => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        fetch('/api/user', { redirect: 'manual' })
            .then((res) => {
                // Reload on redirect (proxy login) or auth errors
                if (
                    res.type === 'opaqueredirect' ||
                    res.status === 401 ||
                    res.status === 403
                ) {
                    location.reload();
                    return;
                }
                if (!res.ok) throw new Error('Failed to fetch user');
                return res.json();
            })
            .then((data) => data && setUser(data))
            .catch(console.error);
    }, []);

    if (!user) {
        return (
            <div className="h-screen flex items-center justify-center text-gray-400">
                Loading...
            </div>
        );
    }

    return (
        <UIProvider>
            <UserProvider userId={user.id} displayName={user.displayName}>
                <ViewProvider>
                    <div className="h-screen flex overflow-hidden">
                        <Switch>
                            <Route path="/space/:spaceId/node/:nodeId">
                                {(params) => (
                                    <SpaceRoute
                                        spaceId={params.spaceId}
                                        nodeId={params.nodeId}
                                    />
                                )}
                            </Route>
                            <Route path="/space/:spaceId">
                                {(params) => (
                                    <SpaceRoute
                                        spaceId={params.spaceId}
                                        nodeId={null}
                                    />
                                )}
                            </Route>
                            <Route>
                                <SpaceRoute spaceId={null} nodeId={null} />
                            </Route>
                        </Switch>
                    </div>
                </ViewProvider>
            </UserProvider>
        </UIProvider>
    );
};

function SpaceRoute({
    spaceId,
    nodeId,
}: {
    spaceId: string | null;
    nodeId: string | null;
}) {
    const [, navigate] = useLocation();

    const handleOpenSpace = (newSpaceId: string) => {
        navigate(`/space/${newSpaceId}`);
    };

    const handleFocusNode = (newNodeId: string | null) => {
        if (!spaceId) return;
        if (newNodeId) {
            navigate(`/space/${spaceId}/node/${newNodeId}`, { replace: true });
        } else {
            navigate(`/space/${spaceId}`, { replace: true });
        }
    };

    return (
        <>
            <Sidebar openSpace={spaceId ?? ''} onOpenSpace={handleOpenSpace} />
            <main className="flex-1 h-full overflow-hidden">
                {spaceId ? (
                    <Space
                        id={spaceId}
                        initialFocusedNode={nodeId}
                        onFocusChange={handleFocusNode}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                        Select or create a space to get started
                    </div>
                )}
            </main>
        </>
    );
}

export default App;
