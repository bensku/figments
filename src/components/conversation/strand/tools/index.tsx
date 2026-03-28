import type { ReactNode } from 'react';
import type z from 'zod';
import {
    ParallelWebFetchInputSchema,
    ParallelWebFetchOutputSchema,
    ParallelWebSearchInputSchema,
    ParallelWebSearchOutputSchema,
} from '@/llm/tool/parallel-schema';
import {
    AnthropicWebFetchCallRenderer,
    AnthropicWebFetchInputSchema,
    AnthropicWebFetchResultSchema,
} from './anthropic-web-fetch';
import {
    AnthropicWebSearchCallRenderer,
    AnthropicWebSearchInputSchema,
    AnthropicWebSearchResultSchema,
} from './anthropic-web-search';
import { GenericToolCallRenderer, GenericToolResultRenderer } from './generic';
import { ParallelWebFetchCallRenderer } from './parallel-web-fetch';
import { ParallelWebSearchCallRenderer } from './parallel-web-search';
import type { ToolCallRenderer, ToolResultRenderer } from './shared';

export { GenericToolCallRenderer, GenericToolResultRenderer };
export type { ToolCallRenderer, ToolResultRenderer };

/**
 * AI SDK wraps locally-executed tool results in { type: 'json', value: ... }.
 * Unwrap to get the actual result data.
 */
function unwrapToolResult(result: unknown): unknown {
    if (
        result &&
        typeof result === 'object' &&
        'type' in result &&
        (result as { type: unknown }).type === 'json' &&
        'value' in result
    ) {
        return (result as { value: unknown }).value;
    }
    return result;
}

/**
 * Wraps a typed tool call renderer with zod validation.
 * If input parsing fails, falls back to GenericToolCallRenderer.
 * Result parsing is best-effort: the typed renderer receives undefined
 * if the result is absent or doesn't match the schema.
 */
function withCallValidation<I, R>(
    toolName: string,
    inputSchema: z.ZodType<I>,
    resultSchema: z.ZodType<R> | undefined,
    Renderer: (props: { input: I; result?: R }) => ReactNode,
): ToolCallRenderer {
    return function ValidatedCallRenderer({
        input,
        result: rawResult,
    }: {
        input: unknown;
        result?: unknown;
    }) {
        const parsedInput = inputSchema.safeParse(input);
        if (!parsedInput.success) {
            return (
                <GenericToolCallRenderer
                    toolName={toolName}
                    input={input}
                    result={rawResult}
                />
            );
        }
        const result = unwrapToolResult(rawResult);
        const parsedResult =
            resultSchema && result != null
                ? resultSchema.safeParse(result)
                : undefined;
        return (
            <Renderer
                input={parsedInput.data}
                result={parsedResult?.success ? parsedResult.data : undefined}
            />
        );
    };
}

export const toolCallRenderers: Record<string, ToolCallRenderer> = {
    web_search: withCallValidation(
        'web_search',
        AnthropicWebSearchInputSchema,
        AnthropicWebSearchResultSchema,
        AnthropicWebSearchCallRenderer,
    ),
    web_fetch: withCallValidation(
        'web_fetch',
        AnthropicWebFetchInputSchema,
        AnthropicWebFetchResultSchema,
        AnthropicWebFetchCallRenderer,
    ),
    parallel_web_search: withCallValidation(
        'parallel_web_search',
        ParallelWebSearchInputSchema,
        ParallelWebSearchOutputSchema,
        ParallelWebSearchCallRenderer,
    ),
    parallel_web_fetch: withCallValidation(
        'parallel_web_fetch',
        ParallelWebFetchInputSchema,
        ParallelWebFetchOutputSchema,
        ParallelWebFetchCallRenderer,
    ),
};
