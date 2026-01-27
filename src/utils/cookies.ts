/**
 * Set a cookie with optional expiration in days.
 * Uses the modern Cookie Store API.
 */
export async function setCookie(
    name: string,
    value: string,
    days?: number,
): Promise<void> {
    const options: CookieInit = {
        name,
        value,
        path: '/',
        sameSite: 'lax',
    };

    if (days) {
        options.expires = Date.now() + days * 24 * 60 * 60 * 1000;
    }

    await cookieStore.set(options);
}

/**
 * Get a cookie value by name, or null if not found.
 * Uses the modern Cookie Store API.
 */
export async function getCookie(name: string): Promise<string | null> {
    const cookie = await cookieStore.get(name);
    return cookie?.value ?? null;
}
