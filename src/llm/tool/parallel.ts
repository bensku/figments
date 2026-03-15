import { tool } from 'ai';
import z from 'zod';
import { registerTool } from './api';

const PARALLEL_API_URL = 'https://api.parallel.ai/v1beta/search';

const SearchToolConfig = z.object({
    maxResults: z
        .int()
        .min(1)
        .max(20)
        .default(10)
        .describe('Maximum search result count'),
    mode: z.enum(['one-shot', 'agentic', 'fast']).default('agentic'),
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

            const response = await fetch(PARALLEL_API_URL, {
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
