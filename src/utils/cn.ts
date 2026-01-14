/**
 * Simple class name utility for conditional styling
 * Combines class names and filters out falsy values
 */
export function cn(
    ...classes: (string | boolean | undefined | null)[]
): string {
    return classes.filter(Boolean).join(' ');
}
