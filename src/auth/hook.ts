import { getKey } from '@bensku/y-query';
import { CONFIG } from '@/config';
import { openDocServer } from '@/sync/server';
import { ShareTokenTable } from '@/tables/space';
import type { Action } from './acl';
import { type Session, validateId, validateUserId } from './user';

export async function requireUser(req: Bun.BunRequest): Promise<Session> {
    const config = CONFIG.auth;

    // For viewing spaces shared with links, clients add space sharing tokens
    // When present, they override other authentication
    // Token can be in header or URL query param (needed for WebSocket connections
    // since browsers don't support custom headers on WS upgrade requests)
    const url = new URL(req.url, 'http://localhost');
    const shareToken =
        req.headers.get('figments-share-token') ??
        url.searchParams.get('shareToken');
    if (shareToken) {
        const parts = shareToken.split('.');
        const userId = validateId(parts[0], 'user id');
        const spaceId = validateId(parts[1], 'space id');
        const token = parts[2];
        if (!token) {
            throw new Error();
        }

        // Check if the token can be found in space's token list
        let tokenValid = false;
        let allowWrites = false;
        await openDocServer(`${userId}/${spaceId}`, async (doc) => {
            const row = getKey(doc, ShareTokenTable, token);
            if (row?.active) {
                tokenValid = true;
                allowWrites = row.allowWrites;
            }
        });

        if (!tokenValid) {
            throw new Error('invalid share token');
        }

        // Everything looks valid, so grant access to target space only as its owner
        const access: Action[] = [
            { type: 'read-space', resource: `${userId}/${spaceId}` },
            { type: 'read-upload', resource: `${userId}/${spaceId}/*` },
        ];
        if (allowWrites) {
            access.push(
                { type: 'write-space', resource: `${userId}/${spaceId}` },
                { type: 'write-upload', resource: `${userId}/${spaceId}/*` },
            );
        }
        return {
            user: {
                id: userId,
                displayName: 'unknown',
            },
            access,
        };
    }

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
