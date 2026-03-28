import { tool } from 'ai';
import z from 'zod';
import { registerTool } from './api';
import {
    ParallelWebFetchInputSchema,
    ParallelWebFetchOutputSchema,
    ParallelWebSearchInputSchema,
    ParallelWebSearchOutputSchema,
} from './parallel-schema';

const PARALLEL_SEARCH_URL = 'https://api.parallel.ai/v1beta/search';
const PARALLEL_EXTRACT_URL = 'https://api.parallel.ai/v1beta/extract';

const SearchToolConfig = z.object({
    maxResults: z
        .int()
        .min(1)
        .max(20)
        .default(10)
        .describe('Maximum search result count'),
    mode: z
        .enum(['one-shot', 'agentic', 'fast'])
        .default('agentic')
        .describe(
            `Search mode. 'agentic' saves tokens, 'fast' is faster. 'one-shot' might help if the model does not support interleaved thinking, but uses more tokens per call.`,
        ),
    maxCharsPerResult: z
        .int()
        .min(1000)
        .default(5000)
        .describe('Maximum characters per search result'),
});

const ExtractToolConfig = z.object({
    maxCharsPerResult: z
        .int()
        .min(1000)
        .default(5000)
        .describe('Maximum characters per fetched URL'),
});

interface ParallelSearchResult {
    url: string;
    title: string | null;
    publish_date: string | null;
    excerpts: string[] | null;
}

interface ParallelSearchResponse {
    search_id: string;
    results: ParallelSearchResult[];
    warnings: { type: string; message: string }[] | null;
}

interface ParallelExtractResult {
    url: string;
    title: string | null;
    publish_date: string | null;
    excerpts: string[] | null;
    full_content: string | null;
}

interface ParallelExtractError {
    url: string;
    error_type: string;
    http_status_code: number | null;
    content: string | null;
}

interface ParallelExtractResponse {
    extract_id: string;
    results: ParallelExtractResult[];
    errors: ParallelExtractError[];
    warnings: { type: string; message: string }[] | null;
}

registerTool('parallel_web_search', SearchToolConfig, (config) => {
    return tool<
        z.infer<typeof ParallelWebSearchInputSchema>,
        z.infer<typeof ParallelWebSearchOutputSchema>
    >({
        description:
            "Search the web for current information using Parallel's AI search. Returns excerpts of relevant web pages. Use this for finding up-to-date information, news, research, and facts.",
        inputSchema: ParallelWebSearchInputSchema,
        outputSchema: ParallelWebSearchOutputSchema,
        execute: async ({ objective, search_queries }) => {
            const apiKey = process.env.PARALLEL_API_KEY;
            if (!apiKey) {
                return {
                    error: 'PARALLEL_API_KEY environment variable is not set',
                    results: [],
                };
            }

            const response = await fetch(PARALLEL_SEARCH_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'parallel-beta': 'search-extract-2025-10-10',
                },
                body: JSON.stringify({
                    objective,
                    search_queries,
                    max_results: config.maxResults,
                    excerpts: {
                        max_chars_per_result: config.maxCharsPerResult,
                    },
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                return {
                    error: `Parallel API error (${response.status}): ${errorText}`,
                    results: [],
                };
            }

            const data = (await response.json()) as ParallelSearchResponse;

            return {
                results: data.results.map((result) => ({
                    url: result.url,
                    title: result.title,
                    publish_date: result.publish_date,
                    excerpts: result.excerpts ?? [], // TODO limit excerpts?
                })),
                warnings: data.warnings,
            };
        },
    });
});

registerTool('parallel_web_fetch', ExtractToolConfig, (config) => {
    return tool<
        z.infer<typeof ParallelWebFetchInputSchema>,
        z.infer<typeof ParallelWebFetchOutputSchema>
    >({
        description:
            "Fetch and extract content from specific web pages using Parallel's extract API. Returns page content as markdown. Use this when you have specific URLs to read, rather than searching for information.",
        inputSchema: ParallelWebFetchInputSchema,
        outputSchema: ParallelWebFetchOutputSchema,
        execute: async ({ urls, objective, full_content: fullContent }) => {
            const apiKey = process.env.PARALLEL_API_KEY;
            if (!apiKey) {
                return {
                    error: 'PARALLEL_API_KEY environment variable is not set',
                    results: [],
                    errors: [],
                };
            }

            const response = await fetch(PARALLEL_EXTRACT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'parallel-beta': 'search-extract-2025-10-10',
                },
                body: JSON.stringify({
                    urls,
                    objective,
                    excerpts: fullContent
                        ? false
                        : { max_chars_per_result: config.maxCharsPerResult },
                    full_content: fullContent
                        ? { max_chars_per_result: config.maxCharsPerResult }
                        : false,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                return {
                    error: `Parallel API error (${response.status}): ${errorText}`,
                    results: [],
                    errors: [],
                };
            }

            const data = (await response.json()) as ParallelExtractResponse;

            return {
                results: data.results.map((result) => ({
                    url: result.url,
                    title: result.title,
                    publish_date: result.publish_date,
                    excerpts: result.excerpts ?? [],
                    full_content: result.full_content ?? '',
                })),
                errors: data.errors.map((err) => ({
                    url: err.url,
                    error_type: err.error_type,
                })),
                warnings: data.warnings,
            };
        },
    });
});
