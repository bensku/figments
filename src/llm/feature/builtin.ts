import { registerFeature } from './registry';

registerFeature({
    id: 'thinking',
    title: 'Extended thinking',
    description:
        'Reason internally to improve answer quality. Also known as reasoning, test-time compute.',
    type: 'toggle',
    defaultValue: false,
});

registerFeature({
    id: 'alwaysThinking',
    title: 'Extended thinking',
    description:
        'Reason internally to improve answer quality. Also known as reasoning, test-time compute.',
    type: 'dummy',
    defaultValue: true,
});

registerFeature({
    id: 'interleavedThinking',
    title: 'Interleaved thinking',
    description:
        'Allow tool calls during thinking. This improves especially web search usage.',
    type: 'toggle',
    defaultValue: true,
    requiresToggles: ['thinking', 'alwaysThinking'],
});

registerFeature({
    id: 'thinkingBudget',
    title: 'Thinking budget',
    description: 'Limit thinking token usage per message.',
    type: 'range',
    min: 2000,
    max: 16000,
    defaultValue: 4000,
    requiresToggles: ['thinking', 'alwaysThinking'],
});

registerFeature({
    id: 'effort',
    title: 'Effort',
    description:
        'Control how eager the model is to use tokens to improve answer quality.',
    type: 'choice',
    choices: [
        { id: 'low', title: 'Low' },
        { id: 'medium', title: 'Medium' },
        { id: 'high', title: 'High' },
    ],
    defaultValue: 'high',
});

registerFeature({
    id: 'thinkingEffort',
    title: 'Thinking effort',
    description: 'Control how many tokens are used by thinking per message',
    type: 'choice',
    choices: [
        { id: 'low', title: 'Low' },
        { id: 'medium', title: 'Medium' },
        { id: 'high', title: 'High' },
        { id: 'xhigh', title: 'Extra high' },
    ],
    defaultValue: 'medium',
    requiresToggles: ['thinking', 'alwaysThinking'],
});

registerFeature({
    id: 'webSearch',
    title: 'Web search',
    description: 'Use web searches to find up-to-date information.',
    type: 'toggle',
    defaultValue: false,
});

registerFeature({
    id: 'webFetch',
    title: 'Web fetch',
    description: 'Fetch web pages linked in the chat.',
    type: 'toggle',
    defaultValue: false,
});

registerFeature({
    id: 'prefill',
    title: 'Response prefill',
    description:
        'Pre-populate the start of AI responses. Ignored when extended thinking is enabled.',
    type: 'text',
    defaultValue: '',
    multiline: true,
    placeholder: 'Certainly!',
});
