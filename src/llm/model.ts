import { createAnthropic } from '@ai-sdk/anthropic';
import { devToolsMiddleware } from '@ai-sdk/devtools';
import { createVertex } from '@ai-sdk/google-vertex';
import { createVertexAnthropic } from '@ai-sdk/google-vertex/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { type LanguageModel, wrapLanguageModel } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import { CONFIG } from '../config';
import type { ModelConfig } from '../config/schema';

export interface Model {
    id: string;
    model: LanguageModel;
    config: ModelConfig;
}

export const MODEL_MAP: Map<string, Model> = new Map();
export const MODELS: Model[] = [];

function register(model: Model) {
    MODEL_MAP.set(model.id, model);
    MODELS.push(model);
}

function createLanguageModel(config: ModelConfig): LanguageModel {
    const apiKey = config.apiKeyEnv ? process.env[config.apiKeyEnv] : undefined;

    switch (config.provider) {
        // Native Anthropic API
        case 'anthropic': {
            const anthropic = createAnthropic({
                baseURL: config.baseUrl,
                apiKey,
            });
            return anthropic(config.model);
        }
        // OpenAI responses API. OpenAI-compatible providers typically DO NOT support this (at least, not well)
        case 'openai': {
            const openai = createOpenAI({
                baseURL: config.baseUrl,
                apiKey,
            });
            return openai.responses(config.model);
        }
        // OpenAI completions API. You shouldn't use this for OpenAI these days
        // But for everything else, it is as close to a standard as there is
        case 'openaiCompatible': {
            if (!config.baseUrl) {
                throw new Error(
                    'custom openapiCompatible providers need API baseUrl!',
                );
            }
            const custom = createOpenAICompatible({
                name: 'custom',
                baseURL: config.baseUrl,
                apiKey,
            });
            return custom(config.model);
        }
        // OpenRouter uses completions API, but supports additional configurations
        case 'openrouter': {
            const openrouter = createOpenAICompatible({
                name: 'openrouter',
                baseURL: config.baseUrl ?? 'https://openrouter.ai/api/v1',
                apiKey: apiKey ?? process.env.OPENROUTER_API_KEY,
            });
            return openrouter(config.model);
        }
        case 'vertex': {
            const vertex = createVertex({
                baseURL: config.baseUrl,
                apiKey,
            });
            return vertex(config.model);
        }
        case 'vertexAnthropic': {
            const vertexAnthropic = createVertexAnthropic({
                baseURL: config.baseUrl,
                googleAuthOptions: {
                    apiKey,
                },
            });
            return vertexAnthropic(config.model);
        }
    }
}

function wrapModel(model: LanguageModel) {
    if (process.env.NODE_ENV !== 'production') {
        return wrapLanguageModel({
            // biome-ignore lint/suspicious/noExplicitAny: this needs LanguageModelV3, which isn't exported
            model: model as any,
            middleware: devToolsMiddleware(),
        });
    }
    return model;
}

// Register models from config
for (const modelConfig of CONFIG.models) {
    register({
        id: modelConfig.id,
        model: wrapModel(createLanguageModel(modelConfig)),
        config: modelConfig,
    });
}

// Test model for development
register({
    id: 'test',
    model: new MockLanguageModelV3({
        doStream: async () => ({
            stream: new ReadableStream({
                async start(controller) {
                    const delay = (ms: number) =>
                        new Promise((r) => setTimeout(r, ms));

                    // Reasoning/thinking block
                    const reasoningId = 'reasoning-0';
                    controller.enqueue({
                        type: 'reasoning-start',
                        id: reasoningId,
                    });
                    for (const chunk of [
                        'Let me think about this... ',
                        'The user is asking for a test response. ',
                        'I should provide something helpful and informative.',
                    ]) {
                        controller.enqueue({
                            type: 'reasoning-delta',
                            id: reasoningId,
                            delta: chunk,
                        });
                        await delay(50);
                    }
                    controller.enqueue({
                        type: 'reasoning-end',
                        id: reasoningId,
                    });

                    // Text response block
                    const textId = 'text-0';
                    controller.enqueue({ type: 'text-start', id: textId });
                    for (const chunk of [
                        'Hello! ',
                        'This is a test response ',
                        'from the mock model. ',
                        'It streams text in multiple parts ',
                        'to simulate real LLM behavior.',
                    ]) {
                        controller.enqueue({
                            type: 'text-delta',
                            id: textId,
                            delta: chunk,
                        });
                        await delay(50);
                    }
                    controller.enqueue({ type: 'text-end', id: textId });

                    controller.enqueue({
                        type: 'finish',
                        finishReason: {
                            unified: 'stop',
                            raw: 'stop',
                        },
                        usage: {
                            inputTokens: {
                                total: 25,
                                noCache: 25,
                                cacheRead: undefined,
                                cacheWrite: undefined,
                            },
                            outputTokens: {
                                total: 45,
                                text: 45,
                                reasoning: undefined,
                            },
                        },
                    });
                    controller.close();
                },
            }),
        }),
    }),
    config: {
        id: 'test',
        displayName: 'Test',
        model: 'figments/test',
        provider: 'openai',
        supportedMediaTypes: [],
        features: [],
    },
});
