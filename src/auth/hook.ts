import { CONFIG } from '@/config';
import type { User } from './user';

export function requireUser(req: Bun.BunRequest): User {
    const config = CONFIG.auth;

    switch (config.type) {
        case 'none': {
            return {
                id: config.userId,
                displayName: config.userName,
            };
        }
        case 'proxy': {
            const id = req.headers.get(config.userIdHeader);
            if (!id) {
                throw new Error(`missing header ${config.userIdHeader}`);
            }
            return {
                id,
                // Default display name to user id if not found
                displayName: req.headers.get(config.userNameHeader) ?? id,
            };
        }
        default:
            throw new Error('unknown auth type');
    }
}
