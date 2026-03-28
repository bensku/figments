import z from 'zod';

export const ParallelWebSearchInputSchema = z.object({
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
});

export const ParallelWebSearchOutputSchema = z.object({
    results: z.array(
        z.object({
            url: z.string(),
            title: z.string().nullable().optional(),
            publish_date: z.string().nullable().optional(),
            excerpts: z.array(z.string()),
        }),
    ),
    warnings: z
        .array(z.object({ type: z.string(), message: z.string() }))
        .nullable()
        .optional(),
});

export const ParallelWebFetchInputSchema = z.object({
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
});

export const ParallelWebFetchOutputSchema = z.object({
    results: z.array(
        z.object({
            url: z.string(),
            title: z.string().nullable(),
            publish_date: z.string().nullable().optional(),
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
    warnings: z
        .array(z.object({ type: z.string(), message: z.string() }))
        .nullable()
        .optional(),
});
