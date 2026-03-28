import z from 'zod';
import {
    ToolExpandButton,
    ToolExpandPanel,
    UrlResultList,
    useToolExpand,
} from './shared';

export const AnthropicWebSearchInputSchema = z.object({
    query: z.string(),
});

export const AnthropicWebSearchResultSchema = z.array(
    z.object({
        url: z.string(),
        title: z.string(),
        pageAge: z.string().optional(),
    }),
);

type Input = z.infer<typeof AnthropicWebSearchInputSchema>;
type Result = z.infer<typeof AnthropicWebSearchResultSchema>;

export function AnthropicWebSearchCallRenderer({
    input,
    result,
}: {
    input: Input;
    result?: Result;
}) {
    const canExpand = !!result && result.length > 0;
    const { expanded, toggle } = useToolExpand(canExpand);

    return (
        <div className="text-sm">
            <ToolExpandButton
                expanded={expanded}
                onToggle={toggle}
                canExpand={canExpand}
            >
                <span>Web search</span>
                <span className="ml-1">&ldquo;{input.query}&rdquo;</span>
                {result && result.length > 0 && (
                    <span className="ml-1 text-gray-500">
                        · {result.length} result
                        {result.length !== 1 && 's'}
                    </span>
                )}
            </ToolExpandButton>
            {expanded && result && (
                <ToolExpandPanel>
                    <UrlResultList
                        items={result.map((r) => ({
                            url: r.url,
                            title: r.title,
                            date: r.pageAge,
                        }))}
                    />
                </ToolExpandPanel>
            )}
        </div>
    );
}
