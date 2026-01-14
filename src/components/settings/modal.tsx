import { useEffect, useState } from 'react';
import { PersonaEditor } from '@/components/settings/persona/editor';
import { Modal } from '@/components/ui/modal';
import { useInstance } from '@/context/instance';
import { useSpace } from '@/context/space';
import { useUser } from '@/context/user';
import { cn } from '@/utils/cn';
import { GeneralSettings } from './general';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultTab?: SettingsTab;
}

export function SettingsModal({
    isOpen,
    onClose,
    defaultTab = 'general',
}: SettingsModalProps) {
    const { userDoc } = useUser();
    const { spaceDoc } = useSpace();
    const { data: instance, loading: instanceLoading } = useInstance();
    const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab);

    // Reset to default tab when modal opens
    useEffect(() => {
        if (isOpen) {
            setActiveTab(defaultTab);
        }
    }, [isOpen, defaultTab]);

    const isUserReady = !instanceLoading && userDoc;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="xl">
            {isUserReady ? (
                <div className="flex h-full">
                    <SettingsSidebar
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                    />
                    <div className="flex-1 min-h-0">
                        {activeTab === 'general' && (
                            <div className="h-full overflow-y-auto">
                                <GeneralSettings userDoc={userDoc} />
                            </div>
                        )}
                        {activeTab === 'personas' && (
                            <div className="h-full w-full">
                                <PersonaEditor
                                    key={activeTab}
                                    defaultView={spaceDoc ? 'space' : 'user'}
                                    isOpen={isOpen}
                                    spaceDoc={spaceDoc}
                                    userDoc={userDoc}
                                    instancePersonas={instance?.personas ?? []}
                                    models={instance?.models ?? []}
                                />
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="p-6 text-center text-gray-500">Loading...</div>
            )}
        </Modal>
    );
}

export type SettingsTab = 'general' | 'personas';

interface SettingsSidebarProps {
    activeTab: SettingsTab;
    onTabChange: (tab: SettingsTab) => void;
}

const TABS: Array<{ id: SettingsTab; label: string }> = [
    { id: 'general', label: 'General' },
    { id: 'personas', label: 'Presets' },
];

function SettingsSidebar({ activeTab, onTabChange }: SettingsSidebarProps) {
    return (
        <nav className="w-48 shrink-0 border-r border-gray-200 py-4">
            <ul className="space-y-1 px-2">
                {TABS.map((tab) => (
                    <li key={tab.id}>
                        <button
                            type="button"
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                                'w-full text-left px-3 py-2 text-sm rounded-lg transition-colors',
                                activeTab === tab.id
                                    ? 'bg-gray-100 text-gray-900 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50',
                            )}
                        >
                            {tab.label}
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
