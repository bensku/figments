import type z from 'zod';
import type { ModelProvider } from '@/config/schema';

/**
 * List of provider quirks/bugs we have workarounds for.
 */
export type ProviderQuirk = 'repeat-reasoning-ends' // Provider emits repeated reasoning-end for each reasoning-delta
;

/**
 * Providers mapped to various quirks/bugs their APIs have.
 */
export const PROVIDER_QUIRKS: Partial<
    Record<z.infer<typeof ModelProvider>, ProviderQuirk[]>
> = {
    baseten: ['repeat-reasoning-ends'],
};
