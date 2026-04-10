import { eq, getKey, select, upsert } from '@bensku/y-query';
import { tool } from 'ai';
import * as Y from 'yjs';
import z from 'zod';
import { FragmentTable, NodeTable } from '@/tables/node';
import type { Persona } from '@/tables/persona';
import { generateFragments } from '../generate';

/**
 * Converts an agent persona to a tool another persona can use to invoke it.
 * @param agent Persona configuration of the agent.
 * @param doc Doc the agent should operate in.
 * @param userId Current user. If agents ever gain access to files, this will
 * be used for access control.
 * @param spaceId Current space. Similar to user, may be used for access control
 * in future.
 * @returns AI SDK Tool.
 */
export function agentToTool(
    agent: Persona,
    doc: Y.Doc,
    userId: string,
    spaceId: string,
) {
    if (agent.type !== 'agent' || !agent.agentConfig) {
        throw new Error('not an agent persona');
    }
    const loopType = agent.agentConfig.loopType;

    return tool({
        description: agent.agentConfig.description,
        inputSchema: z.object({
            message: z
                .string()
                .describe(
                    'Your message to the agent. The agent sees only your messages, so be specific about what you want and include the necessary context!',
                ),
            replyTo: z
                .string()
                .describe(
                    'Id of agent message you wish to reply to. This may be useful if you need to e.g. ask for clarifications. Leave empty if not replying to an existing agent message.',
                )
                .optional(),
        }),
        outputSchema: z.object({
            response: z.string().describe('Agent reply to your message.'),
            messageId: z
                .string()
                .describe(
                    'Id of agent message, so that you can reply to it later.',
                ),
        }),
        execute: async ({ message, replyTo }) => {
            switch (loopType) {
                case 'interleavedThinking': {
                    // Create node that includes the agents prompt
                    const userNode = crypto.randomUUID();
                    upsert(doc, NodeTable, {
                        key: userNode,
                        parentId: replyTo ?? 'agentRoot',
                        role: 'user',
                        createdAt: Date.now(),
                        author: '',
                        summary: '',
                        completed: true,
                    });
                    const fragmentKey = crypto.randomUUID();

                    // Add the agent caller's prompt to it
                    upsert(doc, FragmentTable, {
                        key: fragmentKey,
                        node: userNode,
                        role: 'main',
                        offset: 0,
                        createdAt: Date.now(),
                        data: {
                            type: 'text',
                            text: new Y.Text(),
                        },
                    });
                    const userFragment = getKey(
                        doc,
                        FragmentTable,
                        fragmentKey,
                    );
                    if (userFragment?.data.type === 'text') {
                        userFragment.data.text.insert(0, message);
                    }

                    // Make empty node for agent to generate content to
                    const agentNode = crypto.randomUUID();
                    upsert(doc, NodeTable, {
                        key: agentNode,
                        parentId: userNode,
                        role: 'llm',
                        createdAt: Date.now(),
                        author: agent.model,
                        summary: '',
                        completed: false,
                    });
                    const agentNodeData = getKey(doc, NodeTable, agentNode);
                    if (!agentNodeData) {
                        throw new Error(); // Should be impossible
                    }

                    // Let the agent generate its reply
                    await generateFragments(
                        userId,
                        doc,
                        agentNodeData,
                        'main',
                        spaceId,
                    );

                    // Extract text from agent's reply
                    const fragments = select(
                        doc,
                        FragmentTable,
                        eq('node', agentNode),
                    );
                    let text = '';
                    for (const fragment of fragments) {
                        if (fragment.data.type === 'text') {
                            text += fragment.data.text.toString();
                        } else if (
                            fragment.data.type === 'thinking' ||
                            fragment.data.type === 'toolCall'
                        ) {
                            // Do not send status update text before e.g. tool calls to caller of agent
                            text = '';
                        }
                    }
                    return {
                        response: text,
                        messageId: agentNode,
                    };
                }
            }
        },
    });
}
