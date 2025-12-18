import type { ServerWebSocket } from 'bun';

type EventHandler = (...args: unknown[]) => void;

/**
 * Adapter that bridges Bun's ServerWebSocket to a ws-compatible interface
 * for use with Hocuspocus.
 */
export class WsAdapter {
    private ws: ServerWebSocket<unknown> | null = null;
    private handlers: Map<string, Set<EventHandler>> = new Map();

    readyState = 0; // CONNECTING
    binaryType = 'nodebuffer';

    initialize(ws: ServerWebSocket<unknown>) {
        this.ws = ws;
        this.readyState = 1; // OPEN
    }

    on(event: string, handler: EventHandler) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event)!.add(handler);
        return this;
    }

    once(event: string, handler: EventHandler) {
        const wrappedHandler = (...args: unknown[]) => {
            this.removeListener(event, wrappedHandler);
            handler(...args);
        };
        this.on(event, wrappedHandler);
        return this;
    }

    removeListener(event: string, handler: EventHandler) {
        this.handlers.get(event)?.delete(handler);
        return this;
    }

    off(event: string, handler: EventHandler) {
        return this.removeListener(event, handler);
    }

    emit(event: string, ...args: unknown[]) {
        const handlers = this.handlers.get(event);
        if (handlers) {
            for (const handler of handlers) {
                handler(...args);
            }
        }
        return this;
    }

    send(data: string | Buffer | Uint8Array, callback?: (err?: Error) => void) {
        try {
            this.ws?.send(data);
            callback?.();
        } catch (err) {
            callback?.(err as Error);
        }
    }

    ping(data?: unknown) {
        this.ws?.ping(data ? Buffer.from(String(data)) : undefined);
    }

    close(code?: number, reason?: string) {
        this.readyState = 2; // CLOSING
        this.ws?.close(code, reason);
        this.readyState = 3; // CLOSED
    }

    terminate() {
        this.close();
    }
}
