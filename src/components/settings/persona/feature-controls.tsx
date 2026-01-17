import { Select } from '@/components/ui/select';
import type {
    ChoicefulFeature,
    DummyToggleFeature,
    RangedFeature,
    SimpleFeature,
    TextFeature,
} from '@/llm/feature';
import { cn } from '@/utils/cn';
import { CollapsibleTextarea } from './collapsible-textarea';
import { INPUT_WIDTHS } from './constants';
import { ResetButton } from './reset-button';
import { SPACING } from './styles';

interface ToggleFeatureControlProps {
    feature: SimpleFeature;
    value: boolean;
    isCustomized: boolean;
    onChange: (value: boolean) => void;
    onReset: () => void;
    disabled: boolean;
    available: boolean;
    requiresText?: string;
}

export function ToggleFeatureControl({
    feature,
    value,
    isCustomized,
    onChange,
    onReset,
    disabled,
    available,
    requiresText,
}: ToggleFeatureControlProps) {
    return (
        <div className={SPACING.SECTION_GAP_XS}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <input
                        id={`feature-${feature.id}`}
                        type="checkbox"
                        checked={value}
                        onChange={(e) => onChange(e.target.checked)}
                        disabled={disabled || !available}
                        className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label
                        htmlFor={`feature-${feature.id}`}
                        className={cn(
                            'text-xs font-medium',
                            available ? 'text-gray-700' : 'text-gray-400',
                        )}
                    >
                        {feature.title}
                    </label>
                </div>
                <ResetButton
                    onClick={onReset}
                    visible={isCustomized && !disabled && available}
                />
            </div>
            <p
                className={cn(
                    'text-xs',
                    available ? 'text-gray-500' : 'text-gray-400',
                )}
            >
                {available ? feature.description : requiresText}
            </p>
        </div>
    );
}

interface DummyFeatureControlProps {
    feature: DummyToggleFeature;
}

export function DummyFeatureControl({ feature }: DummyFeatureControlProps) {
    return (
        <div className="space-y-0.5">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <input
                        id={`feature-${feature.id}`}
                        type="checkbox"
                        checked={true}
                        disabled={true}
                        className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label
                        htmlFor={`feature-${feature.id}`}
                        className="text-xs font-medium text-gray-500"
                    >
                        {feature.title}
                    </label>
                </div>
            </div>
            <p className="text-xs text-gray-400">{feature.description}</p>
        </div>
    );
}

interface RangeFeatureControlProps {
    feature: RangedFeature;
    value: number;
    isCustomized: boolean;
    onChange: (value: number) => void;
    onReset: () => void;
    disabled: boolean;
    available: boolean;
    requiresText?: string;
}

export function RangeFeatureControl({
    feature,
    value,
    isCustomized,
    onChange,
    onReset,
    disabled,
    available,
    requiresText,
}: RangeFeatureControlProps) {
    return (
        <div className={SPACING.SECTION_GAP_XS}>
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <label
                        htmlFor={`feature-${feature.id}`}
                        className={cn(
                            'text-xs font-medium flex-shrink-0',
                            available ? 'text-gray-700' : 'text-gray-400',
                        )}
                    >
                        {feature.title}
                    </label>
                    <input
                        id={`feature-${feature.id}`}
                        type="number"
                        value={value}
                        onChange={(e) => onChange(Number(e.target.value))}
                        min={feature.min}
                        max={feature.max}
                        disabled={disabled || !available}
                        className={`${INPUT_WIDTHS.NUMBER} px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500`}
                    />
                    <span className="text-xs text-gray-400 flex-shrink-0">
                        ({feature.min.toLocaleString()} -{' '}
                        {feature.max.toLocaleString()})
                    </span>
                </div>
                <ResetButton
                    onClick={onReset}
                    visible={isCustomized && !disabled && available}
                />
            </div>
            <p
                className={cn(
                    'text-xs',
                    available ? 'text-gray-500' : 'text-gray-400',
                )}
            >
                {available ? feature.description : requiresText}
            </p>
        </div>
    );
}

interface ChoiceFeatureControlProps {
    feature: ChoicefulFeature;
    value: string;
    isCustomized: boolean;
    onChange: (value: string) => void;
    onReset: () => void;
    disabled: boolean;
    available: boolean;
    requiresText?: string;
}

export function ChoiceFeatureControl({
    feature,
    value,
    isCustomized,
    onChange,
    onReset,
    disabled,
    available,
    requiresText,
}: ChoiceFeatureControlProps) {
    return (
        <div className={SPACING.SECTION_GAP_XS}>
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <label
                        htmlFor={`${feature.id}-choice`}
                        className={cn(
                            'text-xs font-medium flex-shrink-0',
                            available ? 'text-gray-700' : 'text-gray-400',
                        )}
                    >
                        {feature.title}
                    </label>
                    <div className={INPUT_WIDTHS.SELECT}>
                        <Select
                            id={`${feature.id}-choice`}
                            options={feature.choices.map(
                                (choice: { id: string; title: string }) => ({
                                    value: choice.id,
                                    label: choice.title,
                                }),
                            )}
                            value={value}
                            onChange={onChange}
                            disabled={disabled || !available}
                            size="sm"
                        />
                    </div>
                </div>
                <ResetButton
                    onClick={onReset}
                    visible={isCustomized && !disabled && available}
                />
            </div>
            <p
                className={cn(
                    'text-xs',
                    available ? 'text-gray-500' : 'text-gray-400',
                )}
            >
                {available ? feature.description : requiresText}
            </p>
        </div>
    );
}

interface TextFeatureControlProps {
    feature: TextFeature;
    value: string;
    isCustomized: boolean;
    onChange: (value: string) => void;
    onReset: () => void;
    disabled: boolean;
    available: boolean;
    requiresText?: string;
    isExpanded?: boolean;
    onExpand?: () => void;
    onCollapse?: () => void;
}

export function TextFeatureControl({
    feature,
    value,
    isCustomized,
    onChange,
    onReset,
    disabled,
    available,
    requiresText,
    isExpanded,
    onExpand,
    onCollapse,
}: TextFeatureControlProps) {
    // For multiline fields with expand/collapse callbacks, use CollapsibleTextarea
    const isCollapsible = feature.multiline && onExpand && onCollapse;

    if (isCollapsible) {
        return (
            <CollapsibleTextarea
                id={`feature-${feature.id}`}
                label={feature.title}
                value={value}
                onChange={onChange}
                placeholder={feature.placeholder}
                description={available ? feature.description : requiresText}
                disabled={disabled || !available}
                isExpanded={isExpanded ?? false}
                onExpand={onExpand}
                onCollapse={() => {
                    onReset();
                    onCollapse();
                }}
            />
        );
    }

    // Non-collapsible text fields (single-line or multiline without expand/collapse)
    return (
        <div className={SPACING.SECTION_GAP_XS}>
            <div className="flex items-center justify-between gap-2">
                <label
                    htmlFor={`feature-${feature.id}`}
                    className={cn(
                        'text-xs font-medium',
                        available ? 'text-gray-700' : 'text-gray-400',
                    )}
                >
                    {feature.title}
                </label>
                <ResetButton
                    onClick={onReset}
                    visible={isCustomized && !disabled && available}
                />
            </div>
            {feature.multiline ? (
                <textarea
                    id={`feature-${feature.id}`}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled || !available}
                    placeholder={feature.placeholder}
                    rows={2}
                    className={cn(
                        'w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                        'resize-none overflow-hidden placeholder:text-gray-400',
                        (disabled || !available) && 'bg-gray-100 text-gray-500',
                    )}
                />
            ) : (
                <input
                    id={`feature-${feature.id}`}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled || !available}
                    placeholder={feature.placeholder}
                    className={cn(
                        'w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                        'placeholder:text-gray-400',
                        (disabled || !available) && 'bg-gray-50 text-gray-500',
                    )}
                />
            )}
            <p
                className={cn(
                    'text-xs',
                    available ? 'text-gray-500' : 'text-gray-400',
                )}
            >
                {available ? feature.description : requiresText}
            </p>
        </div>
    );
}
