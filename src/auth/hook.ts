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
        case 'demo': {
            if (!process.env.FIGMENTS_DEMO_TOKEN) {
                throw new Error('missing FIGMENTS_DEMO_TOKEN env var');
            }
            const demoToken = req.cookies.get('demoToken');
            if (demoToken !== process.env.FIGMENTS_DEMO_TOKEN) {
                throw new Error('invalid demo token');
            }
            const id = req.cookies.get('demoUserId');
            if (!id) {
                throw new Error('missing demo user id');
            }
            return {
                id,
                displayName: 'Demo user',
            };
        }
        default:
            throw new Error('unknown auth type');
    }
}
