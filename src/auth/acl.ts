import type { Session } from './user';

/**
 * Action that an user can perform
 */
export type ActionType =
    | 'read-user'
    | 'write-user'
    | 'read-space'
    | 'write-space'
    | 'read-upload'
    | 'write-upload';

export interface Action {
    type: ActionType;
    resource: string;
}

export function checkAccess(session: Session, actions: Action[]) {
    for (const request of actions) {
        let allowRequest = false;
        for (const allow of session.access) {
            if (allow.type === request.type) {
                // TODO maybe try caching Glob objects, unsure if this matters for performance
                const resources = new Bun.Glob(allow.resource);
                if (resources.match(request.resource)) {
                    allowRequest = true;
                    break; // inner
                }
            }
        }
        if (!allowRequest) {
            throw new Error(`policy does not allow access`);
        }
    }
    // If we reach here, policy allows all of requested actions
}
