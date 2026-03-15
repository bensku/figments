import type { LanguageModelMiddleware } from 'ai';

const CACHE_CONTROL = { type: 'ephemeral' } as const;

/**
 * Stamps Anthropic cache control on the last content part of a message.
 * For system messages (string content), stamps on the message itself.
 * Returns true if a breakpoint was placed.
 */
function stampMessage(msg: {
    role: string;
    content: unknown;
    providerOptions?: Record<string, unknown>;
}): boolean {
    if (msg.role === 'system') {
        // System messages have string content; cache control goes on the message
        msg.providerOptions = {
            ...msg.providerOptions,
            anthropic: {
                ...(msg.providerOptions?.anthropic as
                    | Record<string, unknown>
                    | undefined),
                cacheControl: CACHE_CONTROL,
            },
        };
        return true;
    }

    const content = msg.content;
    if (!Array.isArray(content) || content.length === 0) return false;
    const lastPart = content[content.length - 1];
    if (lastPart && typeof lastPart === 'object') {
        lastPart.providerOptions = {
            ...lastPart.providerOptions,
            anthropic: {
                ...(lastPart.providerOptions?.anthropic as
                    | Record<string, unknown>
                    | undefined),
                cacheControl: CACHE_CONTROL,
            },
        };
        return true;
    }
    return false;
}

/**
 * AI SDK middleware that adds Anthropic cache control breakpoints to reduce
 * input token costs during multi-step tool use.
 *
 * Places up to 3 ephemeral cache breakpoints (out of Anthropic's max of 4):
 * 1. The last system message (caches the system prompt)
 * 2. The last user message (stable boundary between history and tool-use
 *    steps — this is the key breakpoint for multi-step efficiency)
 * 3. The very last message (caches the growing tool-use context so the
 *    next step can reuse it)
 *
 * The user-message breakpoint stays at the same position across all steps
 * of a multi-step tool call, so the entire conversation history prefix is
 * a cache hit from step 2 onward. The last-message breakpoint writes the
 * full prefix (including tool results) so that each step incrementally
 * extends the cache.
 */
export const anthropicCacheMiddleware: LanguageModelMiddleware = {
    specificationVersion: 'v3',
    transformParams: async ({ params }) => {
        const messages = params.prompt;
        // 1. Last system message
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            if (msg?.role === 'system') {
                stampMessage(msg);
                break;
            }
        }

        // 2. Last user message — stable across all tool-use steps
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            if (msg?.role === 'user') {
                stampMessage(msg);
                break;
            }
        }

        // 3. Last message overall (if it's not already the user message)
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.role !== 'user' && lastMsg.role !== 'system') {
            stampMessage(lastMsg);
        }

        return params;
    },
};
