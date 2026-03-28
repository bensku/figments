import type z from 'zod';
import type {
    ParallelWebFetchInputSchema,
    ParallelWebFetchOutputSchema,
} from '@/llm/tool/parallel-schema';
import {
    extractHostname,
    ToolExpandButton,
    ToolExpandPanel,
    UrlResultList,
    useToolExpand,
} from './shared';

type Input = z.infer<typeof ParallelWebFetchInputSchema>;
type Result = z.infer<typeof ParallelWebFetchOutputSchema>;

export function ParallelWebFetchCallRenderer({
    input,
    result,
}: {
    input: Input;
    result?: Result;
}) {
    const results = result?.results;
    const errors = result?.errors;
    const warnings = result?.warnings;
    const canExpand =
        (!!results && results.length > 0) ||
        (!!errors && errors.length > 0) ||
        input.urls.length > 0;
    const { expanded, toggle } = useToolExpand(canExpand);

    return (
        <div className="text-sm">
            <ToolExpandButton
                expanded={expanded}
                onToggle={toggle}
                canExpand={canExpand}
            >
                <span>Web fetch</span>
                <span className="ml-1 text-gray-500 truncate min-w-0">
                    {input.urls[0]}
                </span>
                {input.urls.length > 1 && (
                    <span className="ml-1 text-gray-500 flex-shrink-0">
                        +{input.urls.length - 1}
                    </span>
                )}
                {results && results.length > 0 && (
                    <span className="ml-1 text-gray-500 flex-shrink-0">
                        · {results.length} result
                        {results.length !== 1 && 's'}
                    </span>
                )}
                {errors && errors.length > 0 && (
                    <span className="ml-1 text-red-500 flex-shrink-0">
                        · {errors.length} error{errors.length !== 1 && 's'}
                    </span>
                )}
            </ToolExpandButton>
            {expanded && (
                <ToolExpandPanel>
                    {input.objective && (
                        <div className="text-xs text-gray-500 italic">
                            {input.objective}
                        </div>
                    )}
                    {results && results.length > 0 && (
                        <UrlResultList
                            items={results.map((r) => ({
                                url: r.url,
                                title: r.title,
                                date: r.publish_date,
                            }))}
                        />
                    )}
                    {errors && errors.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                            {errors.map((err) => (
                                <div
                                    key={err.url}
                                    className="text-xs text-red-500"
                                >
                                    {extractHostname(err.url)}: {err.error_type}
                                </div>
                            ))}
                        </div>
                    )}
                    {warnings && warnings.length > 0 && (
                        <div className="mt-1 text-xs text-amber-600">
                            {warnings.map((w) => (
                                <div key={w.message}>{w.message}</div>
                            ))}
                        </div>
                    )}
                </ToolExpandPanel>
            )}
        </div>
    );
}
