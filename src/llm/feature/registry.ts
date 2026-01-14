import type { ModelConfig } from '@/config/schema';
import type { Persona } from '@/tables/persona';
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
    return (
        persona.features.find((feature) => feature.feature === featureId)
            ?.value ?? FEATURE_MAP.get(featureId)?.defaultValue
    );
}
