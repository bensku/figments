import type { ToolConfig } from '@/config/schema';
import type { ToolMeta } from '@/llm/tool/types';
import { SPACING } from './styles';
import { ToolFieldControl } from './tool-controls';

interface ToolListProps {
    tools: ToolMeta[];
    values: ToolConfig[];
    onEnable: (toolId: string) => void;
    onDisable: (toolId: string) => void;
    onUpdateOption: (toolId: string, key: string, value: unknown) => void;
    onResetOption: (toolId: string, key: string) => void;
    isReadOnly: boolean;
}

function formatToolName(id: string): string {
    return id
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export function ToolList({
    tools,
    values,
    onEnable,
    onDisable,
    onUpdateOption,
    onResetOption,
    isReadOnly,
}: ToolListProps) {
    const getToolConfig = (toolId: string): ToolConfig | undefined => {
        return values.find((t) => t.tool === toolId);
    };

    const isToolEnabled = (toolId: string): boolean => {
        return values.some((t) => t.tool === toolId);
    };

    const getFieldValue = (
        toolId: string,
        field: ToolMeta['fields'][number],
    ): unknown => {
        const config = getToolConfig(toolId);
        if (config && field.key in config.options) {
            return config.options[field.key];
        }
        return field.default;
    };

    const isFieldCustomized = (toolId: string, fieldKey: string): boolean => {
        const config = getToolConfig(toolId);
        return config ? fieldKey in config.options : false;
    };

    return (
        <div className={SPACING.SECTION_GAP}>
            {tools.map((tool) => {
                const enabled = isToolEnabled(tool.id);
                return (
                    <div key={tool.id} className={SPACING.SECTION_GAP_XS}>
                        <div className="flex items-center gap-2">
                            <input
                                id={`tool-${tool.id}`}
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) =>
                                    e.target.checked
                                        ? onEnable(tool.id)
                                        : onDisable(tool.id)
                                }
                                disabled={isReadOnly}
                                className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label
                                htmlFor={`tool-${tool.id}`}
                                className="text-xs font-medium text-gray-700"
                            >
                                {formatToolName(tool.id)}
                            </label>
                        </div>
                        {enabled && tool.fields.length > 0 && (
                            <div className="ml-5.5 pl-2 border-l border-gray-200 space-y-2">
                                {tool.fields.map((field) => (
                                    <ToolFieldControl
                                        key={field.key}
                                        field={field}
                                        value={getFieldValue(tool.id, field)}
                                        isCustomized={isFieldCustomized(
                                            tool.id,
                                            field.key,
                                        )}
                                        onChange={(value) =>
                                            onUpdateOption(
                                                tool.id,
                                                field.key,
                                                value,
                                            )
                                        }
                                        onReset={() =>
                                            onResetOption(tool.id, field.key)
                                        }
                                        disabled={isReadOnly}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
