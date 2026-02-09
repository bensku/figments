import { CONFIG } from '@/config';
import type { Action } from './acl';
import { type Session, validateUserId } from './user';

export function requireUser(req: Bun.BunRequest): Session {
    const config = CONFIG.auth;

    switch (config.type) {
        case 'none': {
            const id = validateUserId(config.userId);
            return {
                user: {
                    id,
                    displayName: config.userName,
                },
                access: selfAccess(id),
            };
        }
        case 'proxy': {
            const id = validateUserId(req.headers.get(config.userIdHeader));
            return {
                user: {
                    id,
                    // Default display name to user id if not found
                    displayName: req.headers.get(config.userNameHeader) ?? id,
                },
                access: selfAccess(id),
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
            const id = validateUserId(req.cookies.get('demoUserId'));
            return {
                user: {
                    id,
                    displayName: 'Demo user',
                },
                access: selfAccess(id),
            };
        }
        default:
            throw new Error('unknown auth type');
    }
}

function selfAccess(userId: string): Action[] {
    return [
        { type: 'read-user', resource: userId },
        { type: 'write-user', resource: userId },
        { type: 'read-space', resource: `${userId}/*` }, // user/space
        { type: 'write-space', resource: `${userId}/*` },
        { type: 'read-upload', resource: `${userId}/**` }, // user/space/upload
        { type: 'write-upload', resource: `${userId}/**` },
    ];
}
