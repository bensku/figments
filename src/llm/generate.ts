import { FragmentTable, NodeTable } from '@/tables/node';
import { PersonaTable } from '@/tables/persona';
import { getKey, upsert, type Row } from '@bensku/y-query';
import * as Y from 'yjs';
import { MODEL_MAP } from './model';
import { loadContext } from './context';
import { streamText } from 'ai';

type FragmentRole = Row<typeof FragmentTable>['role'];

export async function generateFragments(
    doc: Y.Doc,
    node: Row<typeof NodeTable>,
    role: FragmentRole,
) {
    const persona = getKey(doc, PersonaTable, node.author);
    if (!persona) {
        throw new Error(`unknown persona: ${node.author}`);
    }
    const model = MODEL_MAP.get(persona.model);
    if (!model) {
        throw new Error(`unknown model: ${persona.model}`);
    }

    // TODO non-main fragment handling

    // Figure what we'll be feeding to the LLM
    const system = persona.systemPrompt;
    const context = loadContext(doc, node);

    // Patch context with persona's options
    const prompt = context[context.length - 1];
    if (prompt) {
        if (persona.promptSuffix) {
            prompt.content += `\n---\n${persona.promptSuffix}`;
        }
    }
    // TODO prefill (if model supports it)

    const result = streamText({
        model: model.model,
        system,
        messages: context,
    });

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

    let current: Row<typeof FragmentTable> | null = null;
    for await (const part of result.fullStream) {
        switch (part.type) {
            case 'reasoning-start':
                current = newFragment({
                    type: 'thinking',
                    text: new Y.Text(),
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
                current = null;
                break;
            case 'text-start':
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
                current = null;
                break;
            case 'tool-call':
                break;
            case 'tool-result':
                break;
            // TODO implement tool calls, though no need to stream those :)
        }
    }

    // Mark LLM node as completed
    upsert(doc, NodeTable, {
        ...node,
        completed: true,
    });
}
