import { type AnthropicProviderOptions, anthropic } from '@ai-sdk/anthropic';
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import { vertexAnthropic } from '@ai-sdk/google-vertex/anthropic';
import type { OpenAIResponsesProviderOptions } from '@ai-sdk/openai';
import type { JSONObject } from '@ai-sdk/provider';
import type { ModelMessage, Tool, ToolSet } from 'ai';
import type z from 'zod';
import type { ModelProvider } from '@/config/schema';
import type { Persona } from '@/tables/persona';
import { featureValue } from '.';

/**
 * Converts a persona's feature configurations into AI SDK tool configurations.
 * Note that not all features are tools; those that aren't need to be separately
 * handled in generateFragments(). Similarly, Figments-provided (local) tools
 * are not model features.
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
            // AI SDK's types have a bug, but this does work
            if (featureValue(persona, 'webSearch')) {
                tools.web_search = anthropic.tools.webSearch_20250305() as Tool;
            }
            if (featureValue(persona, 'webFetch')) {
                tools.web_fetch = anthropic.tools.webFetch_20250910() as Tool;
            }
            break;
        case 'openai':
            // TODO broken due to schema issue
            // AI_TypeValidationError: Type validation failed: Value: {"action":{"type":"search","query":"weather: Helsinki, Finland"},"sources":[{"type":"api","name":"oai-weather"}]}.
            // if (featureValue(persona, 'webSearch')) {
            //     tools.web_search = openai.tools.webSearch();
            // }
            break;
        case 'vertexAnthropic':
            if (featureValue(persona, 'webSearch')) {
                tools.web_search =
                    vertexAnthropic.tools.webSearch_20250305() as Tool;
            }
            break;
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
): Record<string, JSONObject> {
    switch (provider) {
        case 'anthropic':
        case 'vertexAnthropic': {
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
        case 'openai': {
            const reasoning =
                featureValue(persona, 'alwaysThinking') === true ||
                featureValue(persona, 'thinking') === true;
            const options: OpenAIResponsesProviderOptions = {
                store: false, // We'll do context management on Figments end anyway
                reasoningSummary: 'detailed', // TODO configurable
                promptCacheRetention:
                    featureValue(persona, 'extendedPromptCaching') === true
                        ? '24h'
                        : undefined,
                forceReasoning: reasoning,
                // Reasoning on newer OpenAI models is optional, and disabled with reasoningEffort none
                reasoningEffort: reasoning
                    ? (featureValue(persona, 'thinkingEffort') as string)
                    : 'none',
                textVerbosity: featureValue(persona, 'verbosity') as
                    | 'low'
                    | 'medium'
                    | 'high',
                // Everything blows up if we don't include real (encrypted) reasoning, but try to pass just the summaries
                include: ['reasoning.encrypted_content'],
            };
            return {
                openai: options,
            };
        }
        case 'openrouter': {
            const reasoning =
                featureValue(persona, 'alwaysThinking') === true ||
                featureValue(persona, 'thinking') === true;
            const options = {
                reasoning: {
                    enabled: reasoning,
                    effort: featureValue(persona, 'thinkingEffort'),
                    max_tokens: featureValue(persona, 'thinkingBudget'),
                },
            };
            return {
                openai: options,
            };
        }
        case 'vertex': {
            let effort = featureValue(persona, 'thinkingEffort');
            if (effort === 'xhigh') {
                effort = 'high';
            }
            const options: GoogleGenerativeAIProviderOptions = {
                thinkingConfig: {
                    includeThoughts: true,
                    thinkingLevel: effort as 'low' | 'medium' | 'high',
                    thinkingBudget: featureValue(
                        persona,
                        'thinkingBudget',
                    ) as number,
                },
            };
            return {
                google: options,
            };
        }
        case 'baseten': {
            const reasoning =
                featureValue(persona, 'alwaysThinking') === true ||
                featureValue(persona, 'thinking') === true;
            const options = {
                chat_template_args: {
                    enable_thinking: reasoning,
                },
            };
            return {
                baseten: options,
            };
        }
        default:
            return {};
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
        case 'anthropic':
        case 'vertexAnthropic': {
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

/**
 * Applies prefill to the message context if the model supports it.
 * Must be called before streamText() to modify the messages array.
 * @param provider Provider that is used.
 * @param persona The persona configuration.
 * @param context The message context to potentially modify.
 * @returns Modified context with prefill applied, or original context if not supported.
 */
export function applyPrefill(
    provider: z.output<typeof ModelProvider>,
    persona: Persona,
    context: ModelMessage[],
): ModelMessage[] {
    const prefillText = featureValue(persona, 'prefill') as string | undefined;

    if (!prefillText?.trim()) {
        return context;
    }

    switch (provider) {
        case 'anthropic': {
            // Anthropic does not support prefill when extended thinking is enabled
            const thinkingEnabled =
                featureValue(persona, 'thinking') === true ||
                featureValue(persona, 'alwaysThinking') === true;
            if (thinkingEnabled) {
                return context;
            }
            // Anthropic supports prefill by adding a partial assistant message
            return [...context, { role: 'assistant', content: prefillText }];
        }
        default:
            // Other providers in general don't support prefill
            return context;
    }
}
