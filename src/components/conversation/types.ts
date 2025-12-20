/**
 * Extended node with derived tree structure data.
 */
export interface ConversationNode {
    key: string;
    parentId: string;
    role: 'user' | 'llm';
    createdAt: number;
    author: string;
    summary: string;
    completed: boolean;
    /** Derived: keys of child nodes */
    children: string[];
    /** Derived: distance from root (0 for root nodes) */
    depth: number;
}

/**
 * Complete tree state built from flat node data.
 */
export interface TreeState {
    nodes: Map<string, ConversationNode>;
    rootNodes: string[];
}

/**
 * Current strand (path through tree) selection state.
 */
export interface StrandState {
    /** The leaf node that defines this strand */
    selectedLeaf: string | null;
    /** Array of node keys from root to leaf */
    path: string[];
    /** Select a node (finds its default leaf) */
    selectNode: (key: string) => void;
    /** Select a specific branch from a parent */
    selectBranch: (parentKey: string, childKey: string) => void;
    /** Get siblings of a node in the current path */
    getSiblings: (nodeKey: string) => string[];
}

export type ViewMode = 'strand' | 'graph';
