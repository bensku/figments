interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    id?: string;
    size?: 'sm' | 'md';
}

export function Select({
    options,
    value,
    onChange,
    placeholder = 'Select...',
    disabled = false,
    id,
    size = 'md',
}: SelectProps) {
    const sizeClasses =
        size === 'sm'
            ? 'px-2 py-1 text-xs rounded'
            : 'px-3 py-2 text-sm rounded-lg';

    return (
        <select
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={`
                w-full ${sizeClasses} border border-gray-300
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                bg-white transition-colors
                ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}
            `}
        >
            {!value && (
                <option value="" disabled>
                    {placeholder}
                </option>
            )}
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}
