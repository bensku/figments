import type { Persona } from '@/tables/persona';
import type { Tool } from 'ai';
import type z from 'zod';

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
 * @param persona Persona.
 * @returns Dictionary of tools, possibly empty.
 */
export function toolsForPersona(persona: Persona): Record<string, Tool> {
    const tools: Record<string, Tool> = {};
    for (const config of persona.tools) {
        const entry = TOOL_MAP.get(config.tool);
        if (!entry) {
            console.warn('Tool', config.tool, 'used by persona', persona.key, 'does not exist');
            continue;
        }
        // TODO validate tool config against schema somewhere (at boot?), but not here!
        tools[config.tool] = entry.factory(config);
    }

    return tools;
}
