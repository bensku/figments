import type { FeatureConfig } from '@/config/schema';
import type { Feature } from '@/llm/feature';
import {
    ChoiceFeatureControl,
    DummyFeatureControl,
    RangeFeatureControl,
    ToggleFeatureControl,
} from './feature-controls';
import { SPACING } from './styles';

interface FeatureListProps {
    features: Feature[];
    values: FeatureConfig[];
    onUpdate: (featureId: string, value: boolean | number | string) => void;
    onRemove: (featureId: string) => void;
    isReadOnly: boolean;
}

export function FeatureList({
    features,
    values,
    onUpdate,
    onRemove,
    isReadOnly,
}: FeatureListProps) {
    const getFeatureValue = (featureId: string): boolean | number | string => {
        const config = values.find((f) => f.feature === featureId);
        if (config) return config.value;

        const definition = features.find((f) => f.id === featureId);
        return definition?.defaultValue ?? false;
    };

    const isFeatureCustomized = (featureId: string): boolean => {
        return values.some((f) => f.feature === featureId);
    };

    const isFeatureAvailable = (feature: Feature): boolean => {
        if (!feature.requiresToggles || feature.requiresToggles.length === 0) {
            return true;
        }
        return feature.requiresToggles.some((reqId) => {
            const value = getFeatureValue(reqId);
            return value === true;
        });
    };

    const getRequiresText = (feature: Feature): string => {
        if (!feature.requiresToggles || feature.requiresToggles.length === 0) {
            return '';
        }
        const requiredTitles = feature.requiresToggles
            .map((reqId) => features.find((f) => f.id === reqId))
            .filter((reqFeature): reqFeature is Feature => !!reqFeature)
            .map((reqFeature) => reqFeature.title)
            .join(' or ');
        return requiredTitles
            ? `Requires: ${requiredTitles}`
            : 'Requirements not met';
    };

    const renderFeature = (feature: Feature) => {
        const customized = isFeatureCustomized(feature.id);
        const available = isFeatureAvailable(feature);
        const value = getFeatureValue(feature.id);
        const requiresText = getRequiresText(feature);

        switch (feature.type) {
            case 'toggle':
                return (
                    <ToggleFeatureControl
                        key={feature.id}
                        feature={feature}
                        value={value as boolean}
                        isCustomized={customized}
                        onChange={(newValue) => onUpdate(feature.id, newValue)}
                        onReset={() => onRemove(feature.id)}
                        disabled={isReadOnly}
                        available={available}
                        requiresText={requiresText}
                    />
                );

            case 'dummy':
                return (
                    <DummyFeatureControl key={feature.id} feature={feature} />
                );

            case 'range':
                return (
                    <RangeFeatureControl
                        key={feature.id}
                        feature={feature}
                        value={value as number}
                        isCustomized={customized}
                        onChange={(newValue) => onUpdate(feature.id, newValue)}
                        onReset={() => onRemove(feature.id)}
                        disabled={isReadOnly}
                        available={available}
                        requiresText={requiresText}
                    />
                );

            case 'choice':
                return (
                    <ChoiceFeatureControl
                        key={feature.id}
                        feature={feature}
                        value={value as string}
                        isCustomized={customized}
                        onChange={(newValue) => onUpdate(feature.id, newValue)}
                        onReset={() => onRemove(feature.id)}
                        disabled={isReadOnly}
                        available={available}
                        requiresText={requiresText}
                    />
                );
        }
    };

    return (
        <div className={SPACING.SECTION_GAP}>{features.map(renderFeature)}</div>
    );
}
