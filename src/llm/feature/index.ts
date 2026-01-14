interface BaseFeature<T> {
    /**
     * Id of model feature.
     */
    id: string;

    /**
     * User-visible name of feature.
     */
    title: string;

    /**
     * Short description of feature to show on UI.
     */
    description: string;

    /**
     * Default value to use when a new persona is created.
     */
    defaultValue: T;

    /**
     * This feature requires one of these toggle or dummy features to be true.
     */
    requiresToggles?: string[];
}

export interface SimpleFeature extends BaseFeature<boolean> {
    type: 'toggle';
}

export interface DummyToggleFeature extends BaseFeature<boolean> {
    type: 'dummy';
}

export interface RangedFeature extends BaseFeature<number> {
    type: 'range';

    /**
     * Minimum allowed value.
     */
    min: number;

    /**
     * Maximum allowed value.
     */
    max: number;
}

export interface ChoicefulFeature extends BaseFeature<string> {
    type: 'choice';

    choices: { id: string; title: string }[];
}

export type Feature =
    | SimpleFeature
    | DummyToggleFeature
    | RangedFeature
    | ChoicefulFeature;

import './builtin';

export * from './registry';
