import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';

interface HocuspocusConfig {
    /** Document name for the WebSocket connection */
    name: string;
    /** Called when the document is synced with the server */
    onSynced?: (doc: Y.Doc) => void;
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
}: HocuspocusConfig): HocuspocusConnection {
    const doc = new Y.Doc();
    const provider = new HocuspocusProvider({
        url: `ws://${location.hostname}:${location.port}/ws`,
        name,
        document: doc,
        ...(onSynced && { onSynced: () => onSynced(doc) }),
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
