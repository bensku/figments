import {
    createContext,
    type ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';
import type z from 'zod';
import type { PersonaConfig } from '@/config/schema';

type Persona = z.output<typeof PersonaConfig>;

export interface Model {
    id: string;
    displayName: string;
}

interface InstanceData {
    personas: Persona[];
    models: Model[];
}

interface InstanceContextValue {
    data: InstanceData | null;
    loading: boolean;
}

const InstanceContext = createContext<InstanceContextValue | null>(null);

interface InstanceProviderProps {
    children: ReactNode;
}

export function InstanceProvider({ children }: InstanceProviderProps) {
    const [data, setData] = useState<InstanceData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/instance/personas').then((res) => {
                if (!res.ok)
                    throw new Error('Failed to fetch instance personas');
                return res.json() as Promise<Persona[]>;
            }),
            fetch('/api/instance/models').then((res) => {
                if (!res.ok) throw new Error('Failed to fetch instance models');
                return res.json() as Promise<Model[]>;
            }),
        ])
            .then(([personas, models]) => setData({ personas, models }))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    return (
        <InstanceContext.Provider value={{ data, loading }}>
            {children}
        </InstanceContext.Provider>
    );
}

export function useInstance() {
    const context = useContext(InstanceContext);
    if (!context) {
        throw new Error('useInstance must be used within an InstanceProvider');
    }
    return context;
}
