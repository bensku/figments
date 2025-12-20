import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ViewMode } from '@/components/conversation/types';

interface ViewContextValue {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    toggleViewMode: () => void;
}

const ViewContext = createContext<ViewContextValue | null>(null);

interface ViewProviderProps {
    children: ReactNode;
}

export function ViewProvider({ children }: ViewProviderProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('strand');

    const toggleViewMode = () => {
        setViewMode((prev) => (prev === 'strand' ? 'graph' : 'strand'));
    };

    return (
        <ViewContext.Provider value={{ viewMode, setViewMode, toggleViewMode }}>
            {children}
        </ViewContext.Provider>
    );
}

export function useView() {
    const context = useContext(ViewContext);
    if (!context) {
        throw new Error('useView must be used within a ViewProvider');
    }
    return context;
}
