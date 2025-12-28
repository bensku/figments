/** biome-ignore-all lint/style/noNonNullAssertion: settings are not actually nullable, since they have default values */
import { upsert } from '@bensku/y-query';
import { useRow } from '@bensku/y-query-react';
import type * as Y from 'yjs';
import { UserSettingsTable } from '@/tables/user';
import { SettingSelect, SettingToggle } from './controls';

interface GeneralSettingsProps {
    userDoc: Y.Doc;
}

export function GeneralSettings({ userDoc }: GeneralSettingsProps) {
    // Load current settings. If nothing has been edited, load defaults instead
    const settings =
        useRow(userDoc, UserSettingsTable, 'settings', 'content') ??
        UserSettingsTable.type.parse({
            key: 'settings',
        });

    /**
     * Updates a setting value. Pass `undefined` to reset to default.
     */
    const updateSetting = <K extends keyof Omit<typeof settings, 'key'>>(
        key: K,
        value: (typeof settings)[K],
    ) => {
        upsert(userDoc, UserSettingsTable, {
            key: 'settings',
            [key]: value,
        });
    };

    return (
        <div className="p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
                General
            </h3>
            <div className="divide-y divide-gray-100">
                <SettingToggle
                    label="Show Reply Suggestions"
                    description="Display suggested replies in chat view"
                    checked={settings.showReplySuggestions!}
                    defaultValue={true}
                    onChange={(v) => updateSetting('showReplySuggestions', v)}
                />

                <SettingSelect
                    label="Enter Key Behavior"
                    value={settings.sendMessageOn!}
                    defaultValue="ctrl+enter"
                    onChange={(v) => updateSetting('sendMessageOn', v)}
                    options={[
                        {
                            value: 'ctrl+enter',
                            label: 'Add new line',
                            description: 'Ctrl+Enter sends the message',
                        },
                        {
                            value: 'enter',
                            label: 'Send message',
                            description: 'Shift+Enter adds a new line',
                        },
                    ]}
                />
            </div>
        </div>
    );
}
