import type { ServerWebSocket } from 'bun';
import { requireUser } from './auth/hook';
import type { User } from './auth/user';
import { CONFIG } from './config';
import index from './index.html';
import {
    isSafeMimeType,
    loadAttachment,
    saveAttachment,
} from './llm/attachment';
import { modelFeatures } from './llm/feature';
import { hocuspocus } from './sync/server';
import { WsAdapter } from './sync/ws-adapter';

const isDev = process.env.NODE_ENV !== 'production';

interface WebSocketData {
    request: ReturnType<typeof toIncomingMessage>;
    adapter: WsAdapter;
}

/**
 * Create a minimal IncomingMessage-like object from a Bun Request.
 * Hocuspocus only needs .headers and .url properties.
 */
function toIncomingMessage(request: Request, user: User) {
    const url = new URL(request.url);
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
        headers[key] = value;
    });
    return {
        headers,
        url: url.pathname + url.search,
        user,
    };
}

const server = Bun.serve({
    routes: {
        '/*': index,

        // Main sync API - most things use this
        '/ws': async (req, server) => {
            const user = requireUser(req);
            if (
                server.upgrade(req, {
                    data: {
                        request: toIncomingMessage(req, user),
                        adapter: new WsAdapter(),
                    },
                })
            ) {
                return; // WS estabilished, no need to reply
            }
            return new Response('WebSocket upgrade failed', { status: 400 });
        },

        // Allow user to query its own details so that they can be shown in frontend
        '/api/user': async (req) => {
            return Response.json(requireUser(req));
        },

        // Allow user to get list of admin-specified personas (for display purposes)
        '/api/instance/personas': async (req) => {
            requireUser(req);
            // TODO allow instance admin to disable exposing system prompt etc?
            return Response.json(CONFIG.personas);
        },

        '/api/instance/models': async (req) => {
            requireUser(req);
            return Response.json(
                CONFIG.models.map((model) => ({
                    id: model.id,
                    displayName: model.displayName,
                    features: modelFeatures(model),
                })),
            );
        },

        // Serve uploaded attachments
        '/api/attachment/:id': async (req) => {
            const user = requireUser(req);
            const url = new URL(req.url);

            // y-query data describes what type this is
            const mimeType = url.searchParams.get('type');
            if (!isSafeMimeType(mimeType)) {
                // But permit only safe types to prevent users from XSSing themself
                // in case they're somehow convinced to upload dangerous attachments
                // (plus this is very important if sharing is ever implemented!)
                return new Response('type not allowed', { status: 400 });
            }
            const content = await loadAttachment(
                user.id,
                req.params.id,
                mimeType,
            );
            if (content === null) {
                return new Response('not found', { status: 404 });
            }

            return new Response(content, {
                headers: { 'Content-Type': mimeType },
            });
        },

        // Allow attachment uploads!
        '/api/attachment/upload': async (req) => {
            const user = requireUser(req);
            const formData = await req.formData();
            const file = formData.get('file');
            if (!file || typeof file === 'string') {
                return Response.json(
                    { error: 'missing file or type' },
                    { status: 400 },
                );
            }
            const mimeType = file.type;
            if (!isSafeMimeType(mimeType)) {
                return Response.json(
                    { error: 'disallowed mime type' },
                    { status: 400 },
                );
            }

            const id = await saveAttachment(user.id, mimeType, file);
            return Response.json({ id });
        },
    },

    websocket: {
        data: {} as WebSocketData,
        open(ws: ServerWebSocket<WebSocketData>) {
            const { request, adapter } = ws.data;

            // Initialize adapter with the actual WebSocket
            adapter.initialize(ws);

            // Hand off to Hocuspocus
            // biome-ignore lint/suspicious/noExplicitAny: Hocuspocus expects ws WebSocket and IncomingMessage types
            hocuspocus.handleConnection(adapter as any, request as any);
        },

        message(ws: ServerWebSocket<WebSocketData>, message) {
            // Convert ArrayBuffer to Uint8Array if needed
            const data =
                message instanceof ArrayBuffer
                    ? new Uint8Array(message)
                    : message;
            ws.data.adapter.emit('message', data);
        },

        close(ws: ServerWebSocket<WebSocketData>, code, reason) {
            ws.data.adapter.emit('close', code, reason);
        },

        pong(ws: ServerWebSocket<WebSocketData>) {
            ws.data.adapter.emit('pong');
        },
    },

    development: isDev && {
        // Enable browser hot reloading in development
        hmr: true,

        // Echo console logs from the browser to the server
        console: true,
    },
});

console.info(
    `Server running at http://localhost:${server.port} (${isDev ? 'development' : 'production'} mode)`,
);
