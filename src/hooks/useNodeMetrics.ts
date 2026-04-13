import { eq } from '@bensku/y-query';
import { useQuery, useRow } from '@bensku/y-query-react';
import { useMemo } from 'react';
import { useSpaceDoc } from '@/context/space';
import { EventTable, NodeTable } from '@/tables/node';

export interface NodeMetrics {
    /** Time spent loading and preparing context on our side, in ms. */
    contextPrep?: number;
    /** Time spent connecting to and waiting for the LLM provider, in ms. */
    providerHandshake?: number;
    /** Time to first token (stream_start -> first_token), in ms. */
    ttft?: number;
    /** Generation time (first_token -> stream_end), in ms. */
    generation?: number;
    /**
     * Total time from generate_start to stream_end, in ms. Falls back to
     * the sum of available subcomponents when either bookend event is
     * missing.
     */
    totalTime?: number;
    /** Output tokens per second of generation. */
    tokensPerSecond?: number;
    /** Input tokens reported by the provider. */
    inputTokens?: number;
    /** Cached input tokens reported by the provider. */
    cachedInputTokens?: number;
    /** Output tokens reported by the provider. */
    outputTokens?: number;
}

/**
 * Computes timing and token metrics for an LLM node from its EventTable rows
 * and the token counts stored on the node itself. Returned values are undefined
 * when the underlying events are missing (e.g. for generations that errored
 * before producing them).
 */
export function useNodeMetrics(nodeId: string): NodeMetrics {
    const doc = useSpaceDoc();
    const node = useRow(doc, NodeTable, nodeId, 'content');
    const events = useQuery(
        doc,
        EventTable,
        () => eq('node', nodeId),
        [nodeId],
        'content',
    );

    return useMemo(() => {
        const times = new Map<string, number>();
        for (const event of events) {
            times.set(event.type, event.time);
        }

        const generateStart = times.get('generate_start');
        const contextReady = times.get('context_ready');
        const streamStart = times.get('stream_start');
        const firstToken = times.get('first_token');
        const streamEnd = times.get('stream_end');

        const contextPrep =
            generateStart !== undefined && contextReady !== undefined
                ? contextReady - generateStart
                : undefined;
        const providerHandshake =
            contextReady !== undefined && streamStart !== undefined
                ? streamStart - contextReady
                : undefined;
        const ttft =
            streamStart !== undefined && firstToken !== undefined
                ? firstToken - streamStart
                : undefined;
        const generation =
            firstToken !== undefined && streamEnd !== undefined
                ? streamEnd - firstToken
                : undefined;

        let totalTime: number | undefined;
        if (generateStart !== undefined && streamEnd !== undefined) {
            totalTime = streamEnd - generateStart;
        } else {
            const parts = [
                contextPrep,
                providerHandshake,
                ttft,
                generation,
            ].filter((x): x is number => x !== undefined);
            totalTime =
                parts.length > 0 ? parts.reduce((a, b) => a + b, 0) : undefined;
        }

        const inputTokens = node?.inputTokens;
        const cachedInputTokens = node?.cachedInputTokens;
        const outputTokens = node?.outputTokens;
        const tokensPerSecond =
            outputTokens !== undefined &&
            outputTokens > 0 &&
            generation !== undefined &&
            generation > 0
                ? outputTokens / (generation / 1000)
                : undefined;

        return {
            contextPrep,
            providerHandshake,
            ttft,
            generation,
            totalTime,
            tokensPerSecond,
            inputTokens,
            cachedInputTokens,
            outputTokens,
        };
    }, [
        events,
        node?.inputTokens,
        node?.cachedInputTokens,
        node?.outputTokens,
    ]);
}
