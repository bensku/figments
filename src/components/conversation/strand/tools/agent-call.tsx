import z from 'zod';
import {
    formatCharCount,
    ToolExpandButton,
    ToolExpandPanel,
    useToolExpand,
} from './shared';

const AgentCallInputSchema = z.object({
    message: z.string(),
    replyTo: z.string().optional(),
});

const AgentCallOutputSchema = z.object({
    response: z.string(),
    messageId: z.string(),
});

type AgentCallInput = z.infer<typeof AgentCallInputSchema>;

/**
 * Returns true if the input matches the agent tool input schema.
 */
export function isAgentCallInput(input: unknown): input is AgentCallInput {
    return AgentCallInputSchema.safeParse(input).success;
}

/**
 * Unwrap AI SDK json wrapper if present.
 */
function unwrapResult(result: unknown): unknown {
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

export function AgentCallRenderer({
    input,
    result: rawResult,
    agentTitle,
}: {
    input: AgentCallInput;
    result?: unknown;
    agentTitle: string;
}) {
    const parsedResult = AgentCallOutputSchema.safeParse(
        unwrapResult(rawResult),
    );
    const response = parsedResult.success
        ? parsedResult.data.response
        : undefined;
    const hasResponse = !!response && response.length > 0;
    const canExpand = input.message.length > 0 || hasResponse;
    const { expanded, toggle } = useToolExpand(canExpand);

    return (
        <div className="text-sm">
            <ToolExpandButton
                expanded={expanded}
                onToggle={toggle}
                canExpand={canExpand}
            >
                <span>{agentTitle}</span>
                {hasResponse && (
                    <span className="ml-1 text-gray-500">
                        &middot; {formatCharCount(response.length)}
                    </span>
                )}
            </ToolExpandButton>
            {expanded && (
                <ToolExpandPanel>
                    {input.message.length > 0 && (
                        <div>
                            <div className="text-xs text-gray-400 mb-1">
                                Prompt
                            </div>
                            <pre className="text-xs font-mono bg-gray-50 rounded p-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-gray-600">
                                {input.message}
                            </pre>
                        </div>
                    )}
                    {hasResponse && (
                        <div>
                            <div className="text-xs text-gray-400 mb-1">
                                Response
                            </div>
                            <pre className="text-xs font-mono bg-gray-50 rounded p-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-gray-600">
                                {response}
                            </pre>
                        </div>
                    )}
                </ToolExpandPanel>
            )}
        </div>
    );
}
