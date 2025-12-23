import {
    createContext,
    type ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';

interface UIContextValue {
    sidebarCollapsed: boolean;
    setSidebarCollapsed: (collapsed: boolean) => void;
    toggleSidebar: () => void;
}

const UIContext = createContext<UIContextValue | null>(null);

const STORAGE_KEY = 'figments-ui-state';

interface UIProviderProps {
    children: ReactNode;
}

export function UIProvider({ children }: UIProviderProps) {
    const [sidebarCollapsed, setSidebarCollapsedState] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return parsed.sidebarCollapsed ?? false;
            }
        } catch {
            // Ignore storage errors
        }
        return false;
    });

    useEffect(() => {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ sidebarCollapsed }),
            );
        } catch {
            // Ignore storage errors
        }
    }, [sidebarCollapsed]);

    const setSidebarCollapsed = (collapsed: boolean) => {
        setSidebarCollapsedState(collapsed);
    };

    const toggleSidebar = () => {
        setSidebarCollapsedState((prev: boolean) => !prev);
    };

    return (
        <UIContext.Provider
            value={{ sidebarCollapsed, setSidebarCollapsed, toggleSidebar }}
        >
            {children}
        </UIContext.Provider>
    );
}

export function useUI() {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
}
