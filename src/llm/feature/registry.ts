import type { ModelConfig } from '@/config/schema';
import type { Persona } from '@/tables/persona';
import { MODEL_MAP } from '../model';
import type { Feature } from '.';

const FEATURE_MAP: Map<string, Feature> = new Map();

export function registerFeature(feature: Feature) {
    if (FEATURE_MAP.has(feature.id)) {
        throw new Error(`duplicate feature id: ${feature.id}`);
    }
    FEATURE_MAP.set(feature.id, feature);
}

export function modelFeatures(model: ModelConfig): Feature[] {
    return model.features
        .map((id) => FEATURE_MAP.get(id))
        .filter((feature): feature is Feature => !!feature);
}

export function featureValue(persona: Persona, featureId: string) {
    if (!MODEL_MAP.get(persona.model)?.config.features.includes(featureId)) {
        // If model does not even support this feature, how could it have a value?
        // More practically: passing non-undefined value, even null, would probably cause an error
        return undefined;
    }
    return (
        persona.features.find((feature) => feature.feature === featureId)
            ?.value ?? FEATURE_MAP.get(featureId)?.defaultValue
    );
}
