import z from 'zod';
import { useNodeMetrics } from '@/hooks/useNodeMetrics';
import { NodeFragmentList } from '../fragment-list';
import { NodeMetricsFooter } from '../metrics';
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

function formatMs(ms: number): string {
    if (ms < 1000) {
        return `${Math.round(ms)}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
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
    const messageId = parsedResult.success
        ? parsedResult.data.messageId
        : undefined;
    const hasResponse = !!response && response.length > 0;
    const canExpand = input.message.length > 0 || hasResponse || !!messageId;
    const { expanded, toggle } = useToolExpand(canExpand);
    const { expanded: detailsExpanded, toggle: toggleDetails } = useToolExpand(
        !!messageId,
    );

    const metrics = useNodeMetrics(messageId ?? '');

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
                {metrics.totalTime !== undefined && (
                    <span className="ml-1 text-gray-500">
                        &middot; {formatMs(metrics.totalTime)}
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
                    {messageId && (
                        <div>
                            <ToolExpandButton
                                expanded={detailsExpanded}
                                onToggle={toggleDetails}
                            >
                                <span>Progress</span>
                            </ToolExpandButton>
                            {detailsExpanded && (
                                <ToolExpandPanel>
                                    <NodeFragmentList
                                        nodeId={messageId}
                                        skipFinalText
                                    />
                                </ToolExpandPanel>
                            )}
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
                    {messageId && <NodeMetricsFooter nodeId={messageId} />}
                </ToolExpandPanel>
            )}
        </div>
    );
}
