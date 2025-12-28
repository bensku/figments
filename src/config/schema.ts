import z from 'zod';

export const AuthConfig = z.discriminatedUnion('type', [
    // Single-user mode for e.g. local development
    z.object({
        type: z.literal('none'),
        userId: z.string(),
        userName: z.string(),
    }),
    // Trusted proxy handles authentication and passes it on with HTTP headers
    z.object({
        type: z.literal('proxy'),
        userIdHeader: z.string(),
        userNameHeader: z.string(),
    }),
]);

export const ModelConfig = z.object({
    /**
     * Internal ID for referencing this model in Figments (e.g. in personas).
     */
    id: z.string(),
    /**
     * AI SDK provider to use.
     */
    provider: z.enum(['anthropic', 'openai']),
    /**
     * The model ID as understood by the provider.
     */
    model: z.string(),
    /**
     * Human-readable name shown in UI.
     */
    displayName: z.string(),
    /**
     * Custom base URL for the provider API.
     * Useful for proxies like LiteLLM or self-hosted endpoints.
     */
    baseUrl: z.string().optional(),
    /**
     * Environment variable name to read the API key from.
     * Defaults to ANTHROPIC_API_KEY or OPENAI_API_KEY based on provider.
     */
    apiKeyEnv: z.string().optional(),
});

export const PersonaConfig = z.object({
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
    systemPrompt: z.string().optional(),

    /**
     * If non-empty, append this to last user message's prompt when generating.
     * Not applied to node content.
     */
    promptSuffix: z.string().optional(),

    /**
     * Text to prefill in ALL LLM-authored messages. Not applied to node
     * content.
     */
    prefill: z.string().optional(),

    /**
     * If set and true, and this persona is defined in user database, it gets
     * auto-imported to newly created spaces.
     */
    importByDefault: z.boolean().optional(),
});

export const Config = z.object({
    auth: AuthConfig,
    summarizer: z.object({
        model: z.string(),
    }),
    /**
     * Models this instance has access to.
     */
    models: z.array(ModelConfig),
    /**
     * Personas built-in into this Figments instance.
     */
    personas: z.array(PersonaConfig),
});

export type Config = z.output<typeof Config>;
export type ModelConfig = z.output<typeof ModelConfig>;
