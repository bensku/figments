import {
    createContext,
    type ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';
import type z from 'zod';
import type { PersonaConfig } from '@/config/schema';
import type { Feature } from '@/llm/feature';
import type { ToolMeta } from '@/llm/tool/types';

type Persona = z.output<typeof PersonaConfig>;

export interface Model {
    id: string;
    displayName: string;
    features: Feature[];
}

interface InstanceData {
    personas: Persona[];
    models: Model[];
    tools: ToolMeta[];
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
            fetch('/api/instance/tools').then((res) => {
                if (!res.ok) throw new Error('Failed to fetch instance tools');
                return res.json() as Promise<ToolMeta[]>;
            }),
        ])
            .then(([personas, models, tools]) =>
                setData({ personas, models, tools }),
            )
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

/**
 * Like useInstance, but returns null instead of throwing when outside InstanceProvider.
 * Used by hooks that need to work both with and without an instance
 * (e.g. usePersonas in shared space contexts).
 */
export function useOptionalInstance() {
    return useContext(InstanceContext);
}
