import type { Action } from './acl';

export interface User {
    id: string;
    displayName: string;
}

export interface Session {
    user: User;
    access: Action[];
}

/**
 * Characters that are not allowed in IDs.
 * Glob metacharacters and path separators must be rejected to prevent
 * ACL bypass and path traversal attacks.
 */
const FORBIDDEN_ID_CHARS = ['/', '\\', '*', '?', '[', '{', ']', '}', '!', '\0'];

/**
 * Validates that an ID (path segment) is safe for use in resource paths and ACL patterns.
 * Rejects empty strings, path traversal components, and glob metacharacters.
 * @param id The ID to validate.
 * @param label Human-readable label for error messages (e.g. "user id", "space id").
 * @returns The validated ID.
 */
export function validateId(
    id: string | null | undefined,
    label: string,
): string {
    if (!id) {
        throw new Error(`missing ${label}`);
    }
    if (id === '.' || id === '..') {
        throw new Error(`invalid ${label}`);
    }
    if (FORBIDDEN_ID_CHARS.some((ch) => id.includes(ch))) {
        throw new Error(`invalid ${label}`);
    }
    return id;
}

export function validateUserId(id: string | null): string {
    return validateId(id, 'user id');
}
