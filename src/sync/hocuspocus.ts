import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import type { z } from 'zod';
import type { ClientMessage } from './messages';

interface HocuspocusConfig {
    /** Document name for the WebSocket connection */
    name: string;
    /** Called when the document is synced with the server */
    onSynced?: (doc: Y.Doc) => void;
    /** Called when authentication succeeds, with the granted scope */
    onAuthenticated?: (scope: 'read-write' | 'readonly') => void;
    /** Share token for accessing shared spaces (passed as URL query param) */
    shareToken?: string;
}

interface HocuspocusConnection {
    doc: Y.Doc;
    provider: HocuspocusProvider;
    destroy: () => void;
}

/**
 * Creates a Hocuspocus provider with standard auth error handling.
 * Reloads the page on authentication failures (4401/4403).
 */
export function createHocuspocusConnection({
    name,
    onSynced,
    onAuthenticated,
    shareToken,
}: HocuspocusConfig): HocuspocusConnection {
    const doc = new Y.Doc();
    const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = shareToken
        ? `${wsProtocol}//${location.host}/ws?shareToken=${encodeURIComponent(shareToken)}`
        : `${wsProtocol}//${location.host}/ws`;
    const provider = new HocuspocusProvider({
        url: wsUrl,
        name,
        document: doc,
        ...(onSynced && { onSynced: () => onSynced(doc) }),
        ...(onAuthenticated && {
            onAuthenticated: ({
                scope,
            }: {
                scope: 'read-write' | 'readonly';
            }) => onAuthenticated(scope),
        }),
        onAuthenticationFailed: () => location.reload(),
        onClose: ({ event }) => {
            // Hocuspocus uses 4401 (Unauthorized) and 4403 (Forbidden)
            if (event.code === 4401 || event.code === 4403) {
                location.reload();
            }
        },
    });

    return {
        doc,
        provider,
        destroy: () => {
            provider.destroy();
            doc.destroy();
        },
    };
}

/**
 * Send a stateless message to the server via Hocuspocus.
 */
export function sendMessage(
    provider: HocuspocusProvider,
    message: z.infer<typeof ClientMessage>,
) {
    provider.sendStateless(JSON.stringify(message));
}
