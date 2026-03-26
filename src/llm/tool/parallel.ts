import { tool } from 'ai';
import z from 'zod';
import { registerTool } from './api';

const PARALLEL_SEARCH_URL = 'https://api.parallel.ai/v1beta/search';
const PARALLEL_EXTRACT_URL = 'https://api.parallel.ai/v1beta/extract';

const SearchToolConfig = z.object({
    maxResults: z
        .int()
        .min(1)
        .max(20)
        .default(10)
        .describe('Maximum search result count'),
    mode: z.enum(['one-shot', 'agentic', 'fast']).default('agentic'),
});

const ExtractToolConfig = z.object({
    maxCharsPerResult: z
        .int()
        .min(1000)
        .default(5000)
        .describe('Maximum characters per URL'),
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
    return tool({
        description:
            "Search the web for current information using Parallel's AI search. Returns excerpts of relevant web pages. Use this for finding up-to-date information, news, research, and facts.",
        inputSchema: z.object({
            objective: z
                .string()
                .describe(
                    'What you want to find. Be specific about the information needed and include source preferences (e.g., "official documentation", "academic sources") or time constraints (e.g., "from 2024") when relevant.',
                ),
            search_queries: z
                .array(z.string())
                .optional()
                .describe(
                    'Specific keyword queries to supplement the objective. Useful when you know exact terms, product names, or technical phrases that should appear in results.',
                ),
        }),
        outputSchema: z.object({
            results: z.array(
                z.object({
                    url: z.string(),
                    title: z.string(),
                    publish_date: z.string(),
                    excerpts: z.array(z.string()),
                }),
            ),
            warnings: z.any(),
        }),
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
                        max_chars_per_result: 5000,
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
    return tool({
        description:
            "Fetch and extract content from specific web pages using Parallel's extract API. Returns page content as markdown. Use this when you have specific URLs to read, rather than searching for information.",
        inputSchema: z.object({
            urls: z
                .array(z.string())
                .min(1)
                .max(10)
                .describe('URLs to fetch content from (up to 10).'),
            objective: z
                .string()
                .optional()
                .describe(
                    'What information you are looking for. Focuses the extracted excerpts on relevant content.',
                ),
            full_content: z
                .boolean()
                .optional()
                .default(false)
                .describe(
                    'If you really, really need full page content, set this to true to receive it as markdown. By default, only most relevant excerpts are returned.',
                ),
        }),
        outputSchema: z.object({
            results: z.array(
                z.object({
                    url: z.string(),
                    title: z.string(),
                    publish_date: z.string(),
                    excerpts: z.array(z.string()),
                    full_content: z.string(),
                }),
            ),
            errors: z.array(
                z.object({
                    url: z.string(),
                    error_type: z.string(),
                }),
            ),
            warnings: z.any(),
        }),
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
