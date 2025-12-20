import { table, type Row } from '@bensku/y-query';
import z from 'zod';

export const PersonaTable = table(
    'personas',
    z.object({
        key: z.string(),

        /**
         * Title of the persona to show on UI.
         */
        title: z.string(),

        /**
         * Id of model this persona should use.
         */
        model: z.string(),

        /**
         * System prompt of this persona (or part of it, anyway).
         */
        systemPrompt: z.string(),

        /**
         * If non-empty, append this to last user message's prompt when generating.
         * Not applied to node content.
         */
        promptSuffix: z.string(),

        /**
         * Text to prefill in ALL LLM-authored messages. Not applied to node
         * content.
         */
        prefill: z.string(),
    }),
);

export const PersonaSelectionTable = table(
    'selectedPersonas',
    z.object({
        // User id
        key: z.string(),

        personaIds: z.array(z.string()),
    }),
);

export type Persona = Row<typeof PersonaTable>;

export const DEFAULT_PERSONAS: Persona[] = [
    {
        key: 'assistant',
        title: 'Assistant',
        model: 'test',
        systemPrompt:
            'You are a helpful, friendly assistant. Provide clear, accurate, and concise responses.',
        promptSuffix: '',
        prefill: '',
    },
    {
        key: 'coder',
        title: 'Coder',
        model: 'test',
        systemPrompt:
            'You are an expert programmer. Write clean, efficient, and well-documented code. Explain your reasoning when helpful.',
        promptSuffix: '',
        prefill: '',
    },
    {
        key: 'creative',
        title: 'Creative',
        model: 'test',
        systemPrompt:
            'You are a creative writer with a vivid imagination. Craft engaging, original content with rich descriptions and compelling narratives.',
        promptSuffix: '',
        prefill: '',
    },
];
