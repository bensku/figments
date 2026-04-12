import type { LanguageModelMiddleware } from 'ai';

/**
 * Cache style determines which provider options format to use.
 * - 'anthropic': providerOptions.anthropic.cacheControl (Anthropic, Vertex Anthropic)
 * - 'bedrock': providerOptions.bedrock.cachePoint (AWS Bedrock Converse API)
 */
export type CacheStyle = 'anthropic' | 'bedrock';

const CACHE_OPTS = {
    anthropic: {
        key: 'anthropic',
        value: { cacheControl: { type: 'ephemeral' } },
    },
    bedrock: {
        key: 'bedrock',
        value: { cachePoint: { type: 'default' } },
    },
} as const satisfies Record<
    CacheStyle,
    { key: string; value: Record<string, unknown> }
>;

/**
 * Deep-merges cache control into providerOptions, preserving any existing
 * properties under the provider key.
 */
function mergeCache(
    existing: Record<string, unknown> | undefined,
    style: CacheStyle,
): Record<string, unknown> {
    const { key, value } = CACHE_OPTS[style];
    return {
        ...existing,
        [key]: {
            ...(existing?.[key] as Record<string, unknown> | undefined),
            ...value,
        },
    };
}

/**
 * Stamps cache control on a message.
 *
 * Anthropic's API supports cache control on individual content blocks, so we
 * stamp the last content part. Bedrock's Converse API only reads cache points
 * from the message-level providerOptions, so we stamp there instead.
 * System messages always use message-level stamping (string content).
 *
 * Returns true if a breakpoint was placed.
 */
function stampMessage(
    msg: {
        role: string;
        content: unknown;
        providerOptions?: Record<string, unknown>;
    },
    style: CacheStyle,
): boolean {
    if (msg.role === 'system' || style === 'bedrock') {
        msg.providerOptions = mergeCache(msg.providerOptions, style);
        return true;
    }

    const content = msg.content;
    if (!Array.isArray(content) || content.length === 0) return false;
    const lastPart = content[content.length - 1];
    if (lastPart && typeof lastPart === 'object') {
        lastPart.providerOptions = mergeCache(lastPart.providerOptions, style);
        return true;
    }
    return false;
}

/**
 * Creates AI SDK middleware that adds cache control breakpoints to reduce
 * input token costs during multi-step tool use.
 *
 * Places up to 3 ephemeral cache breakpoints (out of the max of 4):
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
export function createCacheMiddleware(
    style: CacheStyle,
): LanguageModelMiddleware {
    return {
        specificationVersion: 'v3',
        transformParams: async ({ params }) => {
            const messages = params.prompt;
            // 1. Last system message
            for (let i = messages.length - 1; i >= 0; i--) {
                const msg = messages[i];
                if (msg?.role === 'system') {
                    stampMessage(msg, style);
                    break;
                }
            }

            // 2. Last user message — stable across all tool-use steps
            for (let i = messages.length - 1; i >= 0; i--) {
                const msg = messages[i];
                if (msg?.role === 'user') {
                    stampMessage(msg, style);
                    break;
                }
            }

            // 3. Last message overall (if it's not already the user message)
            const lastMsg = messages[messages.length - 1];
            if (
                lastMsg &&
                lastMsg.role !== 'user' &&
                lastMsg.role !== 'system'
            ) {
                stampMessage(lastMsg, style);
            }

            return params;
        },
    };
}

export const anthropicCacheMiddleware = createCacheMiddleware('anthropic');
