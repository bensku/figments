import { ToolExpandButton, ToolExpandPanel, useToolExpand } from './shared';

function JsonBlock({ data }: { data: unknown }) {
    if (data === undefined || data === null) return null;

    let text: string;
    try {
        text = JSON.stringify(data, null, 2);
    } catch {
        text = String(data);
    }

    return (
        <pre className="text-xs font-mono bg-gray-50 rounded p-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-gray-600">
            {text}
        </pre>
    );
}

export function GenericToolCallRenderer({
    toolName,
    input,
    result,
}: {
    toolName: string;
    input: unknown;
    result?: unknown;
}) {
    const hasContent =
        (input !== undefined && input !== null) ||
        (result !== undefined && result !== null);
    const { expanded, toggle } = useToolExpand(hasContent);

    return (
        <div className="text-sm">
            <ToolExpandButton
                expanded={expanded}
                onToggle={toggle}
                canExpand={hasContent}
            >
                <span className="font-mono">{toolName}</span>
            </ToolExpandButton>
            {expanded && (
                <ToolExpandPanel>
                    {input !== undefined && input !== null && (
                        <div>
                            <div className="text-xs text-gray-400 mb-1">
                                Input
                            </div>
                            <JsonBlock data={input} />
                        </div>
                    )}
                    {result !== undefined && result !== null && (
                        <div>
                            <div className="text-xs text-gray-400 mb-1">
                                Result
                            </div>
                            <JsonBlock data={result} />
                        </div>
                    )}
                </ToolExpandPanel>
            )}
        </div>
    );
}

export function GenericToolResultRenderer({
    toolName,
    output,
}: {
    toolName: string;
    output: unknown;
}) {
    const hasContent = output !== undefined && output !== null;
    const { expanded, toggle } = useToolExpand(hasContent);

    return (
        <div className="text-sm">
            <ToolExpandButton
                expanded={expanded}
                onToggle={toggle}
                canExpand={hasContent}
            >
                <span>
                    Result: <span className="font-mono">{toolName}</span>
                </span>
            </ToolExpandButton>
            {expanded && hasContent && (
                <ToolExpandPanel>
                    <JsonBlock data={output} />
                </ToolExpandPanel>
            )}
        </div>
    );
}
