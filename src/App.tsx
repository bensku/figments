import { useState } from 'react';
import './index.css';
import { Sidebar } from './components/sidebar';
import { Space } from './components/space';
import { UserProvider } from './context/user';
import { UIProvider } from './context/ui';
import { ViewProvider } from './context/view';

// For now, use a fixed user ID - this would come from auth in a real app
const USER_ID = 'default-user';

export const App = () => {
    const [openSpaceId, setOpenSpaceId] = useState<string | null>(null);

    return (
        <UIProvider>
            <UserProvider userId={USER_ID}>
                <ViewProvider>
                    <div className="h-screen flex overflow-hidden">
                        <Sidebar
                            openSpace={openSpaceId ?? ''}
                            onOpenSpace={setOpenSpaceId}
                        />
                        <main className="flex-1 h-full overflow-hidden">
                            {openSpaceId ? (
                                <Space id={openSpaceId} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400">
                                    Select or create a space to get started
                                </div>
                            )}
                        </main>
                    </div>
                </ViewProvider>
            </UserProvider>
        </UIProvider>
    );
};

export default App;
