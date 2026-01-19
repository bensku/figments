import { getKey, type Row, update, upsert } from '@bensku/y-query';
import { generateText, type ModelMessage, Output, streamText } from 'ai';
import * as Y from 'yjs';
import z from 'zod';
import { CONFIG } from '@/config';
import { ChoiceTable, FragmentTable, NodeTable } from '@/tables/node';
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
import { MODEL_MAP } from './model';
import { getPersona } from './persona';

type FragmentRole = Row<typeof FragmentTable>['role'];

export async function generateFragments(
    userId: string,
    doc: Y.Doc,
    node: Row<typeof NodeTable>,
    role: FragmentRole,
) {
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
            createdAt: Date.now(),
            data,
        });
        return getKey(doc, FragmentTable, key);
    };

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

    // TODO non-main fragment handling

    // Figure what we'll be feeding to the LLM
    const system = persona.systemPrompt ?? undefined;
    const context = await loadContext(userId, doc, node, model, {});

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

    let errored = false;
    try {
        // And now we can actually generate
        const result = streamText({
            model: model.model,
            system,
            messages: messagesWithPrefill,
            // Convert features that are implemented as tools to AI SDK's tools
            tools: personaToTools(model.config.provider, persona),
            // Do same for features implemented with provider-specific API options
            providerOptions: personaToProviderOptions(
                model.config.provider,
                persona,
            ),
            // And for headers to e.g. enable beta features
            headers: personaToHeaders(model.config.provider, persona),
            // Enable raw chunks to access web search citations (AI SDK filters them out)
            includeRawChunks: true,
        });

        // Stream parts and create/update fragments as needed
        let current: Row<typeof FragmentTable> | null = null;
        // Track citations for current text block (source events arrive before text-end)
        let currentBlockCitations: Citation[] = [];

        const fragments = [];
        for await (const part of result.fullStream) {
            switch (part.type) {
                case 'reasoning-start':
                    current = newFragment({
                        type: 'thinking',
                        text: new Y.Text(),
                        providerOptions: undefined,
                    });
                    break;
                case 'reasoning-delta':
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
                    fragments.push(current);
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
                    fragments.push(
                        newFragment({
                            type: 'toolCall',
                            callId: part.toolCallId,
                            toolName: part.toolName,
                            input: part.input,
                        }),
                    );
                    break;
                case 'tool-result':
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
                // TODO fix client-side tool calls - i.e. multiple steps
            }
        }

        // Backfill data that was not available during streaming to parts
        const output = (await result.response).messages;
        if (output.length !== 1 || !output[0]) {
            throw new Error(
                'should not happen, agents are not yet supported and would break many other things!',
            );
        }
        let i = 0; // content might not be real array, so it lacks e.g. entries()
        for (const part of output[0].content) {
            // Add reasoning signatures, tool call metadata, etc.
            const frag = fragments[i];
            if (typeof part === 'object' && frag) {
                if (part.type === 'reasoning') {
                    update(doc, FragmentTable, {
                        key: frag.key,
                        data: {
                            type: 'thinking', // Workaround for writeUnion() bug in y-query, remove if fixed
                            providerOptions: part.providerOptions,
                        },
                    });
                } else if (part.type === 'tool-call') {
                    update(doc, FragmentTable, {
                        key: frag.key,
                        data: {
                            type: 'toolCall',
                            providerExecuted: part.providerExecuted,
                            providerOptions: part.providerOptions,
                        },
                    });
                } else if (part.type === 'tool-result') {
                    update(doc, FragmentTable, {
                        key: frag.key,
                        data: {
                            type: 'toolResult',
                            providerOptions: part.providerOptions,
                        },
                    });
                }
            }
            i++;
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

    // Mark LLM node as completed
    update(doc, NodeTable, {
        key: node.key,
        completed: true,
    });

    // Load context again, this time including the newly created message
    // TODO do not load context again; can be expensive if there are attachments!
    // FIXME if choice and summary models have different supported file types from main model, things break - badly
    const fullContext = await loadContext(userId, doc, node, model, {
        includeTarget: true,
        filterReasoning: true, // Unnecessary context bloat + probably unsupported to use reasoning across models
    });

    // Generate pre-determined choices
    if (!errored) {
        generateChoices(doc, node, [...fullContext]);
    }

    // Summarize node in background for card views
    generateSummary(doc, node, fullContext);
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
        content: `Create three reply options for the above message. One sentence per option!`,
    });

    // Generate JSON that matches our schema
    const result = await generateText({
        model: model.model,
        system: `Your task is to generate reply options for the user, who is chatting with an another AI assistant.

Look at the last message sent by the assistant, and consider how the user might respond to it?
You get to present 3 choices to the user. Write 3 most likely reply options - user can also write their own replies for rarer cases.`,
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
