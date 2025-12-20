/**
 * Generate a hue value from a string hash for consistent author-based colors.
 * Avoids the blue range (200-240) to differentiate from user messages.
 */
export function hashStringToHue(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Return hue between 0-360, but avoid blue range (200-240) to differentiate from user
    const rawHue = Math.abs(hash % 300);
    return rawHue >= 200 ? rawHue + 40 : rawHue;
}
