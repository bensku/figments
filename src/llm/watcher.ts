import { any, watch } from '@bensku/y-query';
import type * as Y from 'yjs';
import { NodeTable } from '@/tables/node';
import { generateFragments } from './generate';

export function watchSpace(doc: Y.Doc) {
    return watch(doc, NodeTable, any(), 'keys', (added) => {
        // We'll need to generate content for added LLM nodes
        for (const node of added) {
            if (node.role === 'llm' && !node.completed) {
                generateFragments(doc, node, 'main');
            }
        }
    });
}
