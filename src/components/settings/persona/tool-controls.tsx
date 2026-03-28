import { Select } from '@/components/ui/select';
import type { ToolFieldMeta } from '@/llm/tool/types';
import { INPUT_WIDTHS } from './constants';
import { ResetButton } from './reset-button';
import { SPACING } from './styles';

interface ToolFieldControlProps {
    field: ToolFieldMeta;
    value: unknown;
    isCustomized: boolean;
    onChange: (value: unknown) => void;
    onReset: () => void;
    disabled: boolean;
}

export function ToolFieldControl({
    field,
    value,
    isCustomized,
    onChange,
    onReset,
    disabled,
}: ToolFieldControlProps) {
    switch (field.type) {
        case 'int':
        case 'number':
            return (
                <div className={SPACING.SECTION_GAP_XS}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <label
                                htmlFor={`tool-field-${field.key}`}
                                className="text-xs font-medium text-gray-700 flex-shrink-0"
                            >
                                {field.key}
                            </label>
                            <input
                                id={`tool-field-${field.key}`}
                                type="number"
                                value={value as number}
                                onChange={(e) =>
                                    onChange(Number(e.target.value))
                                }
                                min={field.min}
                                max={field.max}
                                step={field.type === 'int' ? 1 : undefined}
                                disabled={disabled}
                                className={`${INPUT_WIDTHS.NUMBER} px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500`}
                            />
                            {(field.min != null || field.max != null) && (
                                <span className="text-xs text-gray-400 flex-shrink-0">
                                    {field.min != null && field.max != null
                                        ? `(${field.min.toLocaleString()} - ${field.max.toLocaleString()})`
                                        : field.min != null
                                          ? `(min ${field.min.toLocaleString()})`
                                          : `(max ${field.max?.toLocaleString()})`}
                                </span>
                            )}
                        </div>
                        <ResetButton
                            onClick={onReset}
                            visible={isCustomized && !disabled}
                        />
                    </div>
                    {field.description && (
                        <p className="text-xs text-gray-500">
                            {field.description}
                        </p>
                    )}
                </div>
            );

        case 'enum':
            return (
                <div className={SPACING.SECTION_GAP_XS}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <label
                                htmlFor={`tool-field-${field.key}`}
                                className="text-xs font-medium text-gray-700 flex-shrink-0"
                            >
                                {field.key}
                            </label>
                            <div className={INPUT_WIDTHS.SELECT}>
                                <Select
                                    id={`tool-field-${field.key}`}
                                    options={field.values.map((v) => ({
                                        value: v,
                                        label: v,
                                    }))}
                                    value={value as string}
                                    onChange={(v) => onChange(v)}
                                    disabled={disabled}
                                    size="sm"
                                />
                            </div>
                        </div>
                        <ResetButton
                            onClick={onReset}
                            visible={isCustomized && !disabled}
                        />
                    </div>
                    {field.description && (
                        <p className="text-xs text-gray-500">
                            {field.description}
                        </p>
                    )}
                </div>
            );

        case 'string':
            return (
                <div className={SPACING.SECTION_GAP_XS}>
                    <div className="flex items-center justify-between gap-2">
                        <label
                            htmlFor={`tool-field-${field.key}`}
                            className="text-xs font-medium text-gray-700"
                        >
                            {field.key}
                        </label>
                        <ResetButton
                            onClick={onReset}
                            visible={isCustomized && !disabled}
                        />
                    </div>
                    <input
                        id={`tool-field-${field.key}`}
                        type="text"
                        value={value as string}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                    {field.description && (
                        <p className="text-xs text-gray-500">
                            {field.description}
                        </p>
                    )}
                </div>
            );

        case 'boolean':
            return (
                <div className={SPACING.SECTION_GAP_XS}>
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <input
                                id={`tool-field-${field.key}`}
                                type="checkbox"
                                checked={value as boolean}
                                onChange={(e) => onChange(e.target.checked)}
                                disabled={disabled}
                                className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label
                                htmlFor={`tool-field-${field.key}`}
                                className="text-xs font-medium text-gray-700"
                            >
                                {field.key}
                            </label>
                        </div>
                        <ResetButton
                            onClick={onReset}
                            visible={isCustomized && !disabled}
                        />
                    </div>
                    {field.description && (
                        <p className="text-xs text-gray-500">
                            {field.description}
                        </p>
                    )}
                </div>
            );
    }
}
