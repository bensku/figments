import { getKey, type Row, update, upsert } from '@bensku/y-query';
import {
    generateText,
    type ModelMessage,
    Output,
    stepCountIs,
    streamText,
    wrapLanguageModel,
} from 'ai';
import * as Y from 'yjs';
import z from 'zod';
import { CONFIG } from '@/config';
import { type CacheStyle, createCacheMiddleware } from '@/llm/cache';
import { openDocServer } from '@/sync/server';
import {
    ChoiceTable,
    EventTable,
    FragmentTable,
    NodeTable,
} from '@/tables/node';
import { SpaceTable } from '@/tables/user';
import {
    type Citation,
    extractDocumentCitation,
    extractRawCitation,
} from './citation';
import { loadContext } from './context';
import {
    applyPrefill,
    personaToHeaders,
    personaToProviderOptions,
    personaToTools,
} from './feature/adapter';
import { PROVIDER_QUIRKS } from './feature/quirk';
import { MODEL_MAP } from './model';
import { getPersona } from './persona';
import { toolsForPersona } from './tool';

type FragmentRole = Row<typeof FragmentTable>['role'];

export async function generateFragments(
    userId: string,
    doc: Y.Doc,
    node: Row<typeof NodeTable>,
    role: FragmentRole,
    spaceId: string,
) {
    let offset = 0;
    /**
     * Appends a fragment to currently generated node.
     * @param data Fragment data.
     * @returns The newly appended fragment. You can write text to it.
     */
    const newFragment = (data: Row<typeof FragmentTable>['data']) => {
        const key = crypto.randomUUID();
        upsert(doc, FragmentTable, {
            key,
            node: node.key,
            role,
            offset,
            createdAt: Date.now(),
            data,
        });

        // We'll need to add fragments between the current ones after the fact
        // because AI SDK's streaming support has tendency to filter "unimportant" details
        // such as entire server-side tool calls out...
        // And it turns out, LLM APIs are VERY picky about where those should be put to :/
        offset += 100;

        // biome-ignore lint/style/noNonNullAssertion: we just created this
        return getKey(doc, FragmentTable, key)!;
    };
    const newEvent = (type: Row<typeof EventTable>['type']) => {
        upsert(doc, EventTable, {
            key: crypto.randomUUID(),
            node: node.key,
            type,
            time: Date.now(),
        });
    };
    newEvent('generate_start'); // Started processing the generation request

    let persona = getPersona(doc, node.author);
    if (!persona) {
        persona = getPersona(doc, 'default');
        if (!persona) {
            newFragment({
                type: 'error',
                kind: 'internal',
                message: 'Preset not available!',
            });
            console.error(
                'Missing persona',
                node.author,
                'AND missing default model',
            );
            return;
        } else {
            newFragment({
                type: 'warning',
                message:
                    'Preset was not available, continuing with default preset.',
            });
        }
    }
    let model = MODEL_MAP.get(persona.model);
    if (!model) {
        // Model unavailable; log a warning and continue
        model = MODEL_MAP.get('default');
        if (!model) {
            newFragment({
                type: 'error',
                kind: 'internal',
                message:
                    'The AI model used by preset and default model are both unavailable!',
            });
            console.error(
                'Missing model',
                persona.model,
                'AND missing default model',
            );
            return;
        } else {
            newFragment({
                type: 'warning',
                message:
                    'The AI model used by preset is not available. Continuing with default model.',
            });
        }
    }
    // Get list of quirks we need to work around with the model's provider
    const quirks = PROVIDER_QUIRKS[model.config.provider] ?? [];

    // TODO non-main fragment handling

    // Figure what we'll be feeding to the LLM
    const system = persona.systemPrompt ?? undefined;
    const context = await loadContext(userId, spaceId, doc, node, model, {});

    // Patch context with persona's options
    const prompt = context[context.length - 1];
    if (prompt) {
        if (persona.promptSuffix) {
            prompt.content += `\n---\n${persona.promptSuffix}`;
        }
    }
    // Apply prefill if model supports it
    const messagesWithPrefill = applyPrefill(
        model.config.provider,
        persona,
        context,
    );
    newEvent('context_ready'); // We have context as list of AI SDK messages

    let errored = false;
    let inputTokens: number | undefined;
    let cachedInputTokens: number | undefined;
    let outputTokens: number | undefined;
    try {
        // Wrap with cache middleware for supported providers to reduce
        // input token costs during multi-step tool use
        const cacheStyle: CacheStyle | undefined =
            model.config.provider === 'anthropic' ||
            model.config.provider === 'vertexAnthropic'
                ? 'anthropic'
                : model.config.provider === 'bedrockAnthropic'
                  ? 'bedrock'
                  : undefined;
        const wrappedModel = cacheStyle
            ? wrapLanguageModel({
                  // biome-ignore lint/suspicious/noExplicitAny: wrapLanguageModel expects LanguageModelV3
                  model: model.model as any,
                  middleware: createCacheMiddleware(cacheStyle),
              })
            : model.model;

        // And now we can actually generate
        const result = streamText({
            model: wrappedModel,
            system,
            messages: messagesWithPrefill,
            // Get persona's tools, including model features that are represented as AI SDK's tools
            tools: {
                ...personaToTools(model.config.provider, persona), // Model features to tools
                ...toolsForPersona(doc, userId, spaceId, persona), // Local (Figments-provided) tools and agents
            },
            // Do same for features implemented with provider-specific API options
            providerOptions: personaToProviderOptions(
                model.config.provider,
                persona,
            ),
            // And for headers to e.g. enable beta features
            headers: personaToHeaders(model.config.provider, persona),
            // Enable raw chunks to access web search citations (AI SDK filters them out)
            includeRawChunks: true,
            stopWhen: stepCountIs(persona.maxToolCalls),
        });

        // Stream parts and create/update fragments as needed
        let current: Row<typeof FragmentTable> | null = null;
        // Track citations for current text block (source events arrive before text-end)
        let currentBlockCitations: Citation[] = [];

        const fragments: Row<typeof FragmentTable>[] = [];
        let firstTokenReceived = false;
        for await (const part of result.fullStream) {
            switch (part.type) {
                case 'start':
                    newEvent('stream_start'); // We're connected to LLM provider!
                    break;
                case 'reasoning-start': {
                    // Some "OpenAI-compatible" providers (looking at you, Baseten) may send
                    // reasoning-start and reasoning-end for each token!
                    const prev = fragments[fragments.length - 1];
                    if (
                        quirks.includes('repeat-reasoning-ends') &&
                        prev?.data.type === 'thinking'
                    ) {
                        // Definitely do not create new fragments in that case
                        current = prev;
                        fragments.pop();
                    } else {
                        // Normal reasoning start
                        current = newFragment({
                            type: 'thinking',
                            text: new Y.Text(),
                            providerOptions: undefined,
                        });
                    }
                    break;
                }
                case 'reasoning-delta':
                    if (!firstTokenReceived) {
                        newEvent('first_token'); // LLM is generating something!
                        firstTokenReceived = true;
                    }
                    if (current?.data.type === 'thinking') {
                        current.data.text.insert(
                            current.data.text.length,
                            part.text.toString(),
                        );
                    } else {
                        throw new Error(); // Should never happen
                    }
                    break;
                case 'reasoning-end':
                    if (current) {
                        fragments.push(current);
                    }
                    current = null;
                    break;
                case 'text-start':
                    // openaiCompatible may sometimes produce reasoning-end in wrong place
                    if (current && current.data.type === 'thinking') {
                        fragments.push(current);
                        current = null;
                    }
                    currentBlockCitations = []; // Reset for new text block
                    current = newFragment({
                        type: 'text',
                        text: new Y.Text(),
                    });
                    break;
                case 'text-delta':
                    if (!firstTokenReceived) {
                        newEvent('first_token'); // LLM is generating something!
                        firstTokenReceived = true;
                    }
                    if (current?.data.type === 'text') {
                        current.data.text.insert(
                            current.data.text.length,
                            part.text.toString(),
                        );
                    } else {
                        throw new Error(); // Should never happen
                    }
                    break;
                case 'text-end':
                    if (current) {
                        fragments.push(current);
                    }
                    // Attach collected citations to the fragment if any
                    if (
                        current?.data.type === 'text' &&
                        currentBlockCitations.length > 0
                    ) {
                        update(doc, FragmentTable, {
                            key: current.key,
                            data: {
                                ...current.data,
                                citations: currentBlockCitations,
                            },
                        });
                    }
                    current = null;
                    currentBlockCitations = [];
                    break;
                case 'tool-call':
                    // Unlikely but not impossible that model immediately produces a tool call
                    if (!firstTokenReceived) {
                        newEvent('first_token'); // LLM is generating something!
                        firstTokenReceived = true;
                    }
                    fragments.push(
                        newFragment({
                            type: 'toolCall',
                            callId: part.toolCallId,
                            toolName: part.toolName,
                            input: part.input,
                            providerExecuted: part.providerExecuted,
                        }),
                    );
                    break;
                case 'tool-result':
                    if (!part.providerExecuted) {
                        // Client-side tool results can't be stuffed to same message as their calls
                        // For whatever reason, AI SDK does NOT emit finish-step
                        // So let's just add turn_end ourself
                        if (
                            fragments[fragments.length - 1]?.data.type !==
                            'toolResult'
                        ) {
                            // However, allow putting multiple tool results into one result message
                            fragments.push(
                                newFragment({
                                    type: 'turn_end',
                                }),
                            );
                        }
                    }
                    fragments.push(
                        newFragment({
                            type: 'toolResult',
                            callId: part.toolCallId,
                            toolName: part.toolName,
                            output: part.output,
                        }),
                    );
                    break;
                case 'source': {
                    // Document citations (page_location, char_location) come through here
                    // These have better metadata than raw events, so we use these
                    const docCitation = extractDocumentCitation(
                        model.config.provider,
                        part,
                    );
                    if (docCitation) {
                        currentBlockCitations.push(docCitation);
                    }
                    break;
                }
                case 'finish-step':
                    // After LLM message has finished streaming, AI SDK produces this to mark a message boundary
                    // We'll need to keep track of this to avoid FUN context issues in multi-turn conversation
                    fragments.push(
                        newFragment({
                            type: 'turn_end',
                        }),
                    );
                    break;
                case 'raw': {
                    // Web search citations are filtered by AI SDK, so we extract from raw
                    // Document citations come through 'source' events, skip them here
                    const rawCitation = extractRawCitation(
                        model.config.provider,
                        part.rawValue,
                    );
                    if (
                        rawCitation &&
                        rawCitation.type === 'web_search_result_location'
                    ) {
                        currentBlockCitations.push(rawCitation);
                    }
                    break;
                }
                case 'error':
                    newFragment({
                        type: 'error',
                        kind: 'internal',
                        message:
                            'An internal error occurred while generating this message.',
                    });
                    console.warn('LLM streaming error', part.error);
                    break;
                case 'abort':
                    // TODO do we need to handle this somehow?
                    break;
            }
        }
        newEvent('stream_end'); // And we have all the content. Ostensibly. Unfortunately...

        // Capture token usage if the provider reported it
        try {
            const usage = await result.totalUsage;
            inputTokens = usage.inputTokens;
            cachedInputTokens = usage.inputTokenDetails.cacheReadTokens;
            outputTokens = usage.outputTokens;
        } catch (e) {
            console.warn(
                'Failed to read token usage statistics from provider response',
                e,
            );
        }

        // Backfill data that was not available during streaming to parts
        // This is mostly to work around AI SDK's various bugs...
        const output = (await result.response).messages;

        // Index existing fragments by their natural keys
        type Fragment = NonNullable<(typeof fragments)[0]>;
        const toolCalls = new Map<string, Fragment>();
        const toolResults = new Map<string, Fragment>();
        const textQueue: Fragment[] = [];
        const reasoningQueue: Fragment[] = [];

        for (const frag of fragments) {
            if (!frag) continue;
            switch (frag.data.type) {
                case 'toolCall':
                    toolCalls.set(frag.data.callId, frag);
                    break;
                case 'toolResult':
                    toolResults.set(frag.data.callId, frag);
                    break;
                case 'text':
                    textQueue.push(frag);
                    break;
                case 'thinking':
                    reasoningQueue.push(frag);
                    break;
            }
        }

        /**
         * Insert a fragment immediately after another fragment.
         */
        const insertAfter = (
            data: Row<typeof FragmentTable>['data'],
            after: Row<typeof FragmentTable>,
        ) => {
            const key = crypto.randomUUID();
            upsert(doc, FragmentTable, {
                key,
                node: node.key,
                role,
                offset: after.offset + 1,
                createdAt: Date.now(),
                data,
            });
        };

        // Walk response messages: match existing fragments and backfill data to them
        // If we're missing tool responses, assume they're server-side tools and
        // create new fragments for those
        for (const msg of output) {
            for (const part of msg.content) {
                if (typeof part !== 'object') continue;

                if (part.type === 'reasoning') {
                    const frag = reasoningQueue.shift();
                    if (frag) {
                        update(doc, FragmentTable, {
                            key: frag.key,
                            data: {
                                type: 'thinking',
                                providerOptions: part.providerOptions,
                            },
                        });
                    } else {
                        // If we're merging reasoning blocks to each other, backfilling data to them will fail
                        // Hopefully the provider does not mind!
                        if (!quirks.includes('repeat-reasoning-ends')) {
                            throw new Error(); // Should never happen
                        }
                    }
                } else if (part.type === 'tool-call') {
                    const frag = toolCalls.get(part.toolCallId);
                    if (frag) {
                        update(doc, FragmentTable, {
                            key: frag.key,
                            data: {
                                type: 'toolCall',
                                providerExecuted: part.providerExecuted,
                                providerOptions: part.providerOptions,
                            },
                        });
                    } else {
                        throw new Error(); // Should never happen
                    }
                } else if (part.type === 'tool-result') {
                    const resultFrag = toolResults.get(part.toolCallId);
                    if (resultFrag) {
                        update(doc, FragmentTable, {
                            key: resultFrag.key,
                            data: {
                                type: 'toolResult',
                                providerOptions: part.providerOptions,
                                toolName: part.toolName,
                                output: part.output,
                            },
                        });
                    } else {
                        // Result is missing entirely, uh oh
                        const callFrag = toolCalls.get(part.toolCallId);
                        if (callFrag) {
                            insertAfter(
                                {
                                    type: 'toolResult',
                                    callId: part.toolCallId,
                                    toolName: part.toolName,
                                    output: part.output,
                                    providerOptions: part.providerOptions,
                                },
                                callFrag,
                            );
                        } else {
                            throw new Error(); // Should never happen!
                        }
                    }
                }
            }
        }
    } catch (e) {
        errored = true;
        newFragment({
            type: 'error',
            kind: 'internal',
            message:
                'An internal error occurred while generating this message.',
        });
        console.warn('LLM streaming crash', e);
    }

    // Mark LLM node as completed and track token statistics
    update(doc, NodeTable, {
        key: node.key,
        completed: true,
        inputTokens,
        cachedInputTokens,
        outputTokens,
    });

    // Load context again, this time including the newly created message
    // TODO do not load context again; can be expensive if there are attachments!
    // FIXME if choice and summary models have different supported file types from main model, things break - badly
    const fullContext = await loadContext(userId, spaceId, doc, node, model, {
        includeTarget: true,
        filterReasoning: true, // Unnecessary context bloat + probably unsupported to use reasoning across models
        filterToolUse: true, // Summary/choices only need the final text, not intermediate tool calls
    });

    // Generate pre-determined choices
    if (!errored) {
        await generateChoices(doc, node, [...fullContext]);
    }

    // Summarize node in background for card views
    const summary = await generateSummary(doc, node, fullContext);
    if (context.length === 1) {
        // If this is possibly first LLM-generated message, use its summary as title
        await openDocServer(`${userId}/config`, async (doc) => {
            const row = getKey(doc, SpaceTable, spaceId);
            // Try to avoid overwriting user-written title
            // This might still happen due to race conditions, but that hopefully unlikely enough we don't need to care
            if (row?.title === '') {
                update(doc, SpaceTable, {
                    key: spaceId,
                    title: summary,
                });
            }
        });
    }
}

async function generateSummary(
    doc: Y.Doc,
    node: Row<typeof NodeTable>,
    context: ModelMessage[],
) {
    const model = MODEL_MAP.get(CONFIG.summarizer.model);
    if (!model) {
        console.warn(
            'Summarizer unavailable, model',
            CONFIG.summarizer.model,
            'not found',
        );
        return;
    }

    context.push({
        role: 'user',
        content:
            'Summarize the above message into a title. Few words, capitalize first only! Reply with only the title, nothing else!',
    });

    const result = await generateText({
        model: model.model,
        system: 'You are a message summarizer for an AI chat application.',
        messages: context,
    });
    update(doc, NodeTable, {
        key: node.key,
        summary: result.text,
    });

    return result.text;
}

const GeneratedChoices = z.object({
    replyOptions: z.array(z.string()),
});

async function generateChoices(
    doc: Y.Doc,
    node: Row<typeof NodeTable>,
    context: ModelMessage[],
) {
    if (!CONFIG.choices.enabled) {
        return; // Explicitly configured not to generate choices, that is ok
    }

    const model = MODEL_MAP.get(CONFIG.choices.model ?? 'default');
    if (!model) {
        console.warn(
            'Choice generation failed, model',
            CONFIG.choices.model,
            'not found',
        );
        return;
    }

    context.push({
        role: 'user',
        content: `Create up to three potential replies for the user about the above assistant message. Remember: short and succinct!`,
    });

    // Generate JSON that matches our schema
    const result = await generateText({
        model: model.model,
        system: `When prompted, write up to three potential replies to be presented to the user of AI chat application.
They should be short and on point; do not try to emulate the user's mannerisms.
If you cannot think of good replies (e.g. when starting conversation), it is ok to write none.`,
        messages: context,
        output: Output.object({
            schema: GeneratedChoices,
        }),
    });

    // Truncate down to 3 choices in case LLM decided to ignore the instructions
    const choices = result.output.replyOptions.slice(0, 3);

    // Save and make choices visible to user!
    choices.forEach((choice, i) => {
        upsert(doc, ChoiceTable, {
            key: crypto.randomUUID(),
            node: node.key,
            ordinal: i,
            value: choice,
        });
    });
}
