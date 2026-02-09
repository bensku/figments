import { useEffect, useState } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import type { User } from './auth/user';
import { SharedSpace } from './components/shared-space';
import { Sidebar } from './components/sidebar';
import { Space } from './components/space';
import { InstanceProvider } from './context/instance';
import { ShareTokenProvider } from './context/share-token';
import { SpaceProvider } from './context/space';
import { UIProvider } from './context/ui';
import { UserProvider, useUser } from './context/user';
import { ViewProvider } from './context/view';
import './index.css';

export const App = () => {
    return (
        <Switch>
            {/* Shared space route - no user authentication required */}
            <Route path="/shared/:userId/:spaceId">
                {(params) => (
                    <SharedSpaceRoute
                        userId={params.userId}
                        spaceId={params.spaceId}
                    />
                )}
            </Route>

            {/* Normal authenticated routes */}
            <Route>
                <AuthenticatedApp />
            </Route>
        </Switch>
    );
};

/**
 * Shared space route - renders a minimal view without user authentication.
 * The share token is read from the URL query parameter.
 */
function SharedSpaceRoute({
    userId,
    spaceId,
}: {
    userId: string;
    spaceId: string;
}) {
    const [, navigate] = useLocation();
    const token = new URLSearchParams(window.location.search).get('token');

    if (!token) {
        return (
            <div className="h-screen flex items-center justify-center text-gray-500">
                Invalid share link: missing token
            </div>
        );
    }

    // Construct the full share token as expected by the backend: userId.spaceId.token
    const shareToken = `${userId}.${spaceId}.${token}`;

    const handleFocusNode = (newNodeId: string | null) => {
        if (newNodeId) {
            navigate(
                `/shared/${userId}/${spaceId}?token=${encodeURIComponent(token)}`,
                { replace: true },
            );
        }
    };

    return (
        <ShareTokenProvider shareToken={shareToken}>
            <ViewProvider>
                <div className="h-screen flex flex-col overflow-hidden">
                    <SpaceProvider
                        spaceId={spaceId}
                        ownerUserId={userId}
                        userDoc={null}
                    >
                        <SharedSpace
                            initialFocusedNode={null}
                            onFocusChange={handleFocusNode}
                        />
                    </SpaceProvider>
                </div>
            </ViewProvider>
        </ShareTokenProvider>
    );
}

/**
 * The main authenticated application - requires user login.
 */
function AuthenticatedApp() {
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
        <InstanceProvider>
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
        </InstanceProvider>
    );
}

function SpaceRoute({
    spaceId,
    nodeId,
}: {
    spaceId: string | null;
    nodeId: string | null;
}) {
    const [, navigate] = useLocation();
    const { userDoc } = useUser();

    const handleFocusNode = (newNodeId: string | null) => {
        if (!spaceId) return;
        if (newNodeId) {
            navigate(`/space/${spaceId}/node/${newNodeId}`, { replace: true });
        } else {
            navigate(`/space/${spaceId}`, { replace: true });
        }
    };

    return (
        <SpaceProvider spaceId={spaceId} userDoc={userDoc}>
            <Sidebar openSpace={spaceId ?? ''} />
            <main className="flex-1 h-full overflow-hidden">
                {spaceId ? (
                    <Space
                        initialFocusedNode={nodeId}
                        onFocusChange={handleFocusNode}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                        Select or create a space to get started
                    </div>
                )}
            </main>
        </SpaceProvider>
    );
}

export default App;
