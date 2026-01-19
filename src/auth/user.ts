export interface User {
    id: string;
    displayName: string;
}

export function validateUserId(id: string) {
    if (id.includes('/')) {
        throw new Error(
            `invalid user id ${id}; user ids are not allowed to contain /`,
        );
    }
}
