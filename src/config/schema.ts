import z from 'zod';

export const AuthConfig = z.discriminatedUnion('type', [
    // Single-user mode for e.g. local development
    z.object({
        type: z.literal('none'),
        userId: z.string(),
        userName: z.string(),
    }),
    // Trusted proxy handles authentication and passes it on with HTTP headers
    z.object({
        type: z.literal('proxy'),
        userIdHeader: z.string(),
        userNameHeader: z.string(),
    }),
]);

export const Config = z.object({
    auth: AuthConfig,
});

export type Config = z.output<typeof Config>;
