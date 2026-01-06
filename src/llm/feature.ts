import { type AnthropicProviderOptions, anthropic } from '@ai-sdk/anthropic';
import type { ToolSet } from 'ai';
import type z from 'zod';
import type { FeatureConfig, ModelProvider } from '@/config/schema';

/**
 * Converts a persona's feature configurations into AI SDK tool configurations.
 * Note that not all features are tools; those that aren't need to be separately
 * handled in generateFragments().
 * @param provider Provider that is used.
 * @param features List of feature configurations.
 * @returns Tools to pass for streamText().
 */
export function featuresToTools(
    provider: z.output<typeof ModelProvider>,
    features: z.output<typeof FeatureConfig>[],
): ToolSet {
    const tools: ToolSet = {};

    for (const feature of features) {
        switch (provider) {
            case 'anthropic':
                switch (feature.feature) {
                    // TODO support configuring web search and fetch options
                    case 'webSearch':
                        tools.web_search = anthropic.tools.webSearch_20250305();
                        break;
                    case 'webFetch':
                        tools.web_fetch = anthropic.tools.webFetch_20250910();
                }
                break;
            // TODO OpenAI
            default:
                break;
        }
    }

    return tools;
}

/**
 * Converts persona's feature configurations into provider-specific
 * options, when needed by the feature.
 * @param provider Provider that is used.
 * @param features List of feature configurations.
 * @returns providerOptions for streamText().
 */
export function featuresToProviderOptions(
    provider: z.output<typeof ModelProvider>,
    features: z.output<typeof FeatureConfig>[],
) {
    switch (provider) {
        case 'anthropic': {
            const options: AnthropicProviderOptions = {};
            for (const feature of features) {
                // New Anthropic models allow configuring extended thinking and effort separately
                switch (feature.feature) {
                    case 'thinking':
                        options.thinking = {
                            type: 'enabled',
                            budgetTokens:
                                options.thinking?.budgetTokens ?? 4000,
                        };
                        break;
                    case 'effort':
                        options.effort = ANTHROPIC_EFFORTS[feature.level] as
                            | 'low'
                            | 'medium'
                            | 'high';
                        options.thinking = {
                            type: options.thinking?.type ?? 'disabled',
                            budgetTokens:
                                ANTHROPIC_THINKING_BUDGETS[feature.level],
                        };
                        break;
                }
            }
            return {
                anthropic: options,
            };
        }
        // TODO OpenAI
    }
}

const ANTHROPIC_EFFORTS = {
    low: 'low',
    medium: 'medium',
    high: 'high',
    xhigh: 'high',
};
const ANTHROPIC_THINKING_BUDGETS = {
    low: 2000,
    medium: 4000,
    high: 8000,
    xhigh: 16000,
};
