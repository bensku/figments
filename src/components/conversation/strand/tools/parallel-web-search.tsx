import type z from 'zod';
import type {
    ParallelWebSearchInputSchema,
    ParallelWebSearchOutputSchema,
} from '@/llm/tool/parallel-schema';
import {
    ToolExpandButton,
    ToolExpandPanel,
    UrlResultList,
    useToolExpand,
} from './shared';

type Input = z.infer<typeof ParallelWebSearchInputSchema>;
type Result = z.infer<typeof ParallelWebSearchOutputSchema>;

export function ParallelWebSearchCallRenderer({
    input,
    result,
}: {
    input: Input;
    result?: Result;
}) {
    const results = result?.results ?? [];
    const warnings = result?.warnings ?? [];
    const canExpand = results.length > 0;
    const { expanded, toggle } = useToolExpand(canExpand);

    return (
        <div className="text-sm">
            <ToolExpandButton
                expanded={expanded}
                onToggle={toggle}
                canExpand={canExpand}
            >
                <span>Web search</span>
                <span className="ml-1 truncate min-w-0">
                    &ldquo;{input.objective}&rdquo;
                </span>
                {results.length > 0 && (
                    <span className="ml-1 text-gray-500 flex-shrink-0">
                        · {results.length} result
                        {results.length !== 1 && 's'}
                    </span>
                )}
            </ToolExpandButton>
            {expanded && results.length > 0 && (
                <ToolExpandPanel>
                    <UrlResultList
                        items={results.map((r) => ({
                            url: r.url,
                            title: r.title,
                            date: r.publish_date,
                        }))}
                    />
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
