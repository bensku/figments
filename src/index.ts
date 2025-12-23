import type { ServerWebSocket } from 'bun';
import { requireUser } from './auth/hook';
import { CONFIG } from './config';
import index from './index.html';
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
function toIncomingMessage(request: Request) {
    const url = new URL(request.url);
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
        headers[key] = value;
    });
    return {
        headers,
        url: url.pathname + url.search,
    };
}

const server = Bun.serve({
    routes: {
        '/*': index,

        // Main sync API - most things use this
        '/ws': async (req, server) => {
            requireUser(req);
            if (
                server.upgrade(req, {
                    data: {
                        request: toIncomingMessage(req),
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
