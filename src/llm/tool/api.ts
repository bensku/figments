import type { Tool } from 'ai';
import type * as Y from 'yjs';
import z from 'zod';
import type { Persona } from '@/tables/persona';
import { getPersona } from '../persona';
import { agentToTool } from './agent';
import type { ToolFieldMeta, ToolMeta } from './types';

interface ToolEntry {
    id: string;
    config: unknown;
    // biome-ignore lint/suspicious/noExplicitAny: each tool has its own config schema
    factory: (config: any) => Tool;
}

export const ALL_TOOLS: ToolEntry[] = [];
const TOOL_MAP: Map<string, ToolEntry> = new Map();

export function registerTool<T extends z.ZodObject>(
    id: string,
    config: T,
    factory: (config: z.infer<T>) => Tool,
) {
    const entry = { id, config, factory };
    ALL_TOOLS.push(entry);
    TOOL_MAP.set(id, entry);
}

/**
 * Gets local tools for given persona, ready to be given to AI SDK.
 * @param doc Current space's Y.Doc.
 * @param userId User id. This and space id are needed to create agent tools,
 * which use these details for access control.
 * @param spaceId Space id. Needed for same reason as user id.
 * @param persona Persona.
 * @returns Dictionary of tools, possibly empty.
 */
export function toolsForPersona(
    doc: Y.Doc,
    userId: string,
    spaceId: string,
    persona: Persona,
): Record<string, Tool> {
    const tools: Record<string, Tool> = {};
    // Client-side (i.e. Figments-executed) tools
    for (const config of persona.tools) {
        const entry = TOOL_MAP.get(config.tool);
        if (!entry) {
            console.warn(
                'Tool',
                config.tool,
                'used by persona',
                persona.key,
                'does not exist',
            );
            continue;
        }
        // TODO validate tool config against schema somewhere (at boot?), but not here!
        tools[config.tool] = entry.factory(config);
    }

    // Agents using the agent tool
    if (persona.agentCallMode === 'tool') {
        // One tool per agent
        for (const agentId of persona.agents) {
            const agent = getPersona(doc, agentId);
            if (agent) {
                tools[agentId] = agentToTool(agent, doc, userId, spaceId);
            } else {
                console.warn(
                    'Agent',
                    agentId,
                    'used by persona',
                    persona.key,
                    'does not exist',
                );
            }
        }
    }

    return tools;
}

function introspectField(key: string, schema: unknown): ToolFieldMeta | null {
    let inner = schema;
    let defaultValue: unknown;
    let description: string | undefined;

    // Capture description from outermost level
    if (
        inner &&
        typeof inner === 'object' &&
        'description' in inner &&
        typeof (inner as { description: unknown }).description === 'string'
    ) {
        description = (inner as { description: string }).description;
    }

    // Unwrap ZodDefault
    if (inner instanceof z.ZodDefault) {
        defaultValue = inner._def.defaultValue;
        inner = inner._def.innerType;
    }

    // Capture description from inner if not found on outer
    if (
        !description &&
        inner &&
        typeof inner === 'object' &&
        'description' in inner &&
        typeof (inner as { description: unknown }).description === 'string'
    ) {
        description = (inner as { description: string }).description;
    }

    if (inner instanceof z.ZodNumber) {
        const isInt =
            'isInt' in inner && (inner as { isInt: unknown }).isInt === true;
        const rawMin =
            'minValue' in inner
                ? ((inner as { minValue: unknown }).minValue as
                      | number
                      | undefined)
                : undefined;
        const rawMax =
            'maxValue' in inner
                ? ((inner as { maxValue: unknown }).maxValue as
                      | number
                      | undefined)
                : undefined;
        // Filter out Zod's implicit bounds (MIN/MAX_SAFE_INTEGER)
        const minValue =
            rawMin != null && rawMin > Number.MIN_SAFE_INTEGER
                ? rawMin
                : undefined;
        const maxValue =
            rawMax != null && rawMax < Number.MAX_SAFE_INTEGER
                ? rawMax
                : undefined;
        return {
            type: isInt ? 'int' : 'number',
            key,
            description,
            default: defaultValue as number | undefined,
            min: minValue,
            max: maxValue,
        };
    }

    if (inner instanceof z.ZodEnum) {
        const enumObj = (inner as { enum: Record<string, string> }).enum;
        return {
            type: 'enum',
            key,
            description,
            default: defaultValue as string | undefined,
            values: Object.values(enumObj),
        };
    }

    if (inner instanceof z.ZodString) {
        return {
            type: 'string',
            key,
            description,
            default: defaultValue as string | undefined,
        };
    }

    if (inner instanceof z.ZodBoolean) {
        return {
            type: 'boolean',
            key,
            description,
            default: defaultValue as boolean | undefined,
        };
    }

    return null;
}

/**
 * Returns metadata for all registered tools, suitable for sending to the client.
 */
export function toolMetadata(): ToolMeta[] {
    return ALL_TOOLS.map((entry) => {
        const schema = entry.config as z.ZodObject;
        const fields: ToolFieldMeta[] = [];
        for (const [key, fieldSchema] of Object.entries(schema.shape)) {
            const field = introspectField(key, fieldSchema);
            if (field) {
                fields.push(field);
            }
        }
        return { id: entry.id, fields };
    });
}
