import z from 'zod';
import {
    extractHostname,
    formatCharCount,
    ToolExpandButton,
    ToolExpandPanel,
    useToolExpand,
} from './shared';

export const AnthropicWebFetchInputSchema = z.object({
    url: z.string(),
});

export const AnthropicWebFetchResultSchema = z.object({
    url: z.string(),
    content: z.object({
        title: z.string().nullable().optional(),
        source: z.object({
            data: z.string(),
        }),
    }),
});

type Input = z.infer<typeof AnthropicWebFetchInputSchema>;
type Result = z.infer<typeof AnthropicWebFetchResultSchema>;

export function AnthropicWebFetchCallRenderer({
    input,
    result,
}: {
    input: Input;
    result?: Result;
}) {
    const contentText = result?.content.source.data;
    const title = result?.content.title;
    const hasContent = !!contentText && contentText.length > 0;
    const canExpand = hasContent || !!title;
    const { expanded, toggle } = useToolExpand(canExpand);

    return (
        <div className="text-sm">
            <ToolExpandButton
                expanded={expanded}
                onToggle={toggle}
                canExpand={canExpand}
            >
                <span>Web fetch</span>
                <a
                    href={input.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-gray-500 hover:text-gray-700 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                >
                    {extractHostname(input.url)}
                </a>
                {hasContent && (
                    <span className="ml-1 text-gray-500">
                        · {formatCharCount(contentText.length)}
                    </span>
                )}
            </ToolExpandButton>
            {expanded && (
                <ToolExpandPanel>
                    {title && (
                        <div className="text-xs text-gray-700 font-medium">
                            {title}
                        </div>
                    )}
                    {hasContent && (
                        <pre className="text-xs font-mono bg-gray-50 rounded p-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-gray-600">
                            {contentText}
                        </pre>
                    )}
                </ToolExpandPanel>
            )}
        </div>
    );
}
