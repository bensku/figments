import { anthropic } from '@ai-sdk/anthropic';
import type { LanguageModel } from 'ai';
import { MockLanguageModelV2 } from 'ai/test';

export interface Model {
    id: string;
    model: LanguageModel;
    displayName: string;
}

export const MODEL_MAP: Map<string, Model> = new Map();
export const MODELS: Model[] = [];

function register(model: Model) {
    MODEL_MAP.set(model.id, model);
    MODELS.push(model);
}

register({
    id: 'test',
    displayName: 'Test model',
    model: new MockLanguageModelV2({
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
                        finishReason: 'stop',
                        usage: {
                            inputTokens: 25,
                            outputTokens: 45,
                            totalTokens: 70,
                        },
                    });
                    controller.close();
                },
            }),
        }),
    }),
});
register({
    id: 'claude-4-haiku',
    displayName: 'Claude Haiku 4.5',
    model: anthropic('claude-haiku-4-5'),
});
