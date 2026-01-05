import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
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
        case 'anthropic': {
            const anthropic = createAnthropic({
                baseURL: config.baseUrl,
                apiKey,
            });
            return anthropic(config.model);
        }
        case 'openai': {
            const openai = createOpenAI({
                baseURL: config.baseUrl,
                apiKey,
            });
            return openai(config.model);
        }
    }
}

// Register models from config
for (const modelConfig of CONFIG.models) {
    register({
        id: modelConfig.id,
        model: createLanguageModel(modelConfig),
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
    },
});
