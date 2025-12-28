interface SettingToggleProps {
    label: string;
    description?: string;
    checked: boolean;
    defaultValue?: boolean;
    onChange: (checked: boolean | undefined) => void;
}

export function SettingToggle({
    label,
    description,
    checked,
    defaultValue,
    onChange,
}: SettingToggleProps) {
    const isModified = defaultValue !== undefined && checked !== defaultValue;

    return (
        <div className="flex items-start justify-between py-3">
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                        {label}
                    </span>
                    {isModified && (
                        <button
                            type="button"
                            onClick={() => onChange(undefined)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                        >
                            Reset
                        </button>
                    )}
                </div>
                {description && (
                    <p className="text-sm text-gray-500 mt-0.5">
                        {description}
                    </p>
                )}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`
                    relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
                    border-2 border-transparent transition-colors duration-200 ease-in-out
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${checked ? 'bg-blue-600' : 'bg-gray-200'}
                `}
            >
                <span
                    className={`
                        pointer-events-none inline-block h-5 w-5 transform rounded-full
                        bg-white shadow ring-0 transition duration-200 ease-in-out
                        ${checked ? 'translate-x-5' : 'translate-x-0'}
                    `}
                />
            </button>
        </div>
    );
}

interface SettingSelectOption<T extends string> {
    value: T;
    label: string;
    description?: string;
}

interface SettingSelectProps<T extends string> {
    label: string;
    description?: string;
    value: T;
    defaultValue?: T;
    onChange: (value: T | undefined) => void;
    options: SettingSelectOption<T>[];
}

export function SettingSelect<T extends string>({
    label,
    description,
    value,
    defaultValue,
    onChange,
    options,
}: SettingSelectProps<T>) {
    const isModified = defaultValue !== undefined && value !== defaultValue;

    return (
        <div className="py-3">
            <div className="mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                        {label}
                    </span>
                    {isModified && (
                        <button
                            type="button"
                            onClick={() => onChange(undefined)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                        >
                            Reset
                        </button>
                    )}
                </div>
                {description && (
                    <p className="text-sm text-gray-500 mt-0.5">
                        {description}
                    </p>
                )}
            </div>
            <div className="space-y-2">
                {options.map((option) => (
                    <label
                        key={option.value}
                        className="flex items-start gap-3 cursor-pointer"
                    >
                        <input
                            type="radio"
                            name={label}
                            value={option.value}
                            checked={value === option.value}
                            onChange={() => onChange(option.value)}
                            className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                            <span className="text-sm text-gray-700">
                                {option.label}
                            </span>
                            {option.description && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {option.description}
                                </p>
                            )}
                        </div>
                    </label>
                ))}
            </div>
        </div>
    );
}
