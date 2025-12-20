import { useQuery } from '@bensku/y-query-react';
import { or, eq } from '@bensku/y-query';
import { useMemo } from 'react';
import type * as Y from 'yjs';
import { NodeTable } from '@/tables/node';
import type { ConversationNode, TreeState } from '../types';

/**
 * Builds a tree structure from flat Yjs node data.
 * Computes children arrays and depth for each node.
 */
export function useConversationTree(doc: Y.Doc): TreeState {
    // Show all LLM nodes (even incomplete - they're streaming) but hide incomplete user nodes (drafts)
    const nodes = useQuery(
        doc,
        NodeTable,
        () => or(eq('role', 'llm'), eq('completed', true)),
        [],
        'content',
    );

    return useMemo(() => {
        const nodeMap = new Map<string, ConversationNode>();
        const rootNodes: string[] = [];

        // First pass: create nodes with empty children
        for (const node of nodes) {
            nodeMap.set(node.key, {
                ...node,
                children: [],
                depth: 0,
            });
            if (node.parentId === 'root') {
                rootNodes.push(node.key);
            }
        }

        // Second pass: build parent→child relationships
        for (const node of nodes) {
            if (node.parentId !== 'root') {
                const parent = nodeMap.get(node.parentId);
                if (parent) {
                    parent.children.push(node.key);
                }
            }
        }

        // Sort children by createdAt for consistent ordering
        for (const node of nodeMap.values()) {
            node.children.sort((a, b) => {
                const nodeA = nodeMap.get(a);
                const nodeB = nodeMap.get(b);
                return (nodeA?.createdAt ?? 0) - (nodeB?.createdAt ?? 0);
            });
        }

        // Sort root nodes by createdAt too
        rootNodes.sort((a, b) => {
            const nodeA = nodeMap.get(a);
            const nodeB = nodeMap.get(b);
            return (nodeA?.createdAt ?? 0) - (nodeB?.createdAt ?? 0);
        });

        // Third pass: calculate depths via BFS
        const queue = rootNodes.map((key) => ({ key, depth: 0 }));
        while (queue.length > 0) {
            const item = queue.shift();
            if (!item) break;
            const { key, depth } = item;
            const node = nodeMap.get(key);
            if (node) {
                node.depth = depth;
                for (const childKey of node.children) {
                    queue.push({ key: childKey, depth: depth + 1 });
                }
            }
        }

        return { nodes: nodeMap, rootNodes };
    }, [nodes]);
}

/**
 * Finds the most recently modified leaf node in the tree.
 * A leaf is a node with no children.
 */
export function findMostRecentLeaf(tree: TreeState): string | null {
    let mostRecentLeaf: string | null = null;
    let mostRecentTime = -Infinity;

    for (const node of tree.nodes.values()) {
        if (node.children.length === 0 && node.createdAt > mostRecentTime) {
            mostRecentTime = node.createdAt;
            mostRecentLeaf = node.key;
        }
    }

    return mostRecentLeaf;
}

/**
 * Finds a leaf node by following the first child path from a given node.
 */
export function findDefaultLeaf(tree: TreeState, nodeKey: string): string {
    let current = nodeKey;
    let node = tree.nodes.get(current);

    while (node && node.children.length > 0) {
        const firstChild = node.children[0];
        if (!firstChild) break;
        current = firstChild;
        node = tree.nodes.get(current);
    }

    return current;
}

/**
 * Finds the most recently created leaf node that is a descendant of nodeKey.
 * Returns null if nodeKey is not in tree or has no leaf descendants.
 */
export function findMostRecentDescendantLeaf(
    tree: TreeState,
    nodeKey: string,
): string | null {
    let mostRecentLeaf: string | null = null;
    let mostRecentTime = -Infinity;

    // BFS to find all descendants
    const queue = [nodeKey];
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) break;
        const node = tree.nodes.get(current);
        if (!node) continue;

        if (node.children.length === 0) {
            // It's a leaf
            if (node.createdAt > mostRecentTime) {
                mostRecentTime = node.createdAt;
                mostRecentLeaf = current;
            }
        } else {
            // Add children to queue
            queue.push(...node.children);
        }
    }

    return mostRecentLeaf;
}
