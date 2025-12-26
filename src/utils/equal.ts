export function deepEqual(a: unknown, b: unknown): boolean {
    // Same reference or primitive equality
    if (a === b) return true;

    // Handle null/undefined
    if (a == null || b == null) return false;

    // Different types
    if (typeof a !== typeof b) return false;

    // Array comparison
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!deepEqual(a[i], b[i])) return false;
        }
        return true;
    }

    // One is array, other is not
    if (Array.isArray(a) !== Array.isArray(b)) return false;

    // Object comparison
    if (typeof a === 'object' && typeof b === 'object') {
        const keysA = Object.keys(a as object);
        const keysB = Object.keys(b as object);

        if (keysA.length !== keysB.length) return false;

        for (const key of keysA) {
            if (!Object.hasOwn(b as object, key)) return false;
            if (
                !deepEqual(
                    (a as Record<string, unknown>)[key],
                    (b as Record<string, unknown>)[key],
                )
            )
                return false;
        }
        return true;
    }

    return false;
}
