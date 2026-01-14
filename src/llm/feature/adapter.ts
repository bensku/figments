import { type AnthropicProviderOptions, anthropic } from '@ai-sdk/anthropic';
import type { ToolSet } from 'ai';
import type z from 'zod';
import type { ModelProvider } from '@/config/schema';
import type { Persona } from '@/tables/persona';
import { featureValue } from '.';

/**
 * Converts a persona's feature configurations into AI SDK tool configurations.
 * Note that not all features are tools; those that aren't need to be separately
 * handled in generateFragments().
 * @param provider Provider that is used.
 * @param persona The persona configuration.
 * @returns Tools to pass for streamText().
 */
export function personaToTools(
    provider: z.output<typeof ModelProvider>,
    persona: Persona,
): ToolSet {
    const tools: ToolSet = {};

    switch (provider) {
        case 'anthropic':
            if (featureValue(persona, 'webSearch')) {
                tools.web_search = anthropic.tools.webSearch_20250305();
            }
            if (featureValue(persona, 'webFetch')) {
                tools.web_fetch = anthropic.tools.webFetch_20250910();
            }
            break;
        // TODO OpenAI
        default:
            break;
    }

    return tools;
}

/**
 * Converts persona's feature configurations into provider-specific
 * options, when needed by the feature.
 * @param provider Provider that is used.
 * @param persona The persona configuration.
 * @returns providerOptions for streamText().
 */
export function personaToProviderOptions(
    provider: z.output<typeof ModelProvider>,
    persona: Persona,
) {
    switch (provider) {
        case 'anthropic': {
            const thinking = featureValue(persona, 'thinking') === true;
            const options: AnthropicProviderOptions = {
                thinking: {
                    type: thinking ? 'enabled' : 'disabled',
                    budgetTokens: thinking
                        ? ((featureValue(
                              persona,
                              'thinkingBudget',
                          ) as number) ?? 4096)
                        : undefined,
                },
                effort: featureValue(persona, 'effort') as
                    | 'low'
                    | 'medium'
                    | 'high',
            };
            return {
                anthropic: options,
            };
        }
        // TODO OpenAI
    }
}

/**
 * Converts persona into custom HTTP headers. This is sometimes needed for
 * enabling provider's beta features.
 * @param provider Provider that is used.
 * @param persona The persona configuration.
 * @returns Extra HTTP headers.
 */
export function personaToHeaders(
    provider: z.output<typeof ModelProvider>,
    persona: Persona,
) {
    switch (provider) {
        case 'anthropic': {
            const thinking = featureValue(persona, 'thinking') === true;
            return {
                'anthropic-beta':
                    thinking && featureValue(persona, 'interleavedThinking')
                        ? 'interleaved-thinking-2025-05-14'
                        : undefined,
            };
        }
        // TODO OpenAI
    }
}
