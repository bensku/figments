import type { Serve } from 'bun';

// See https://github.com/oven-sh/bun/issues/23182
export function router<W, R extends string>(routes: Serve.Routes<W, R>) {
    return routes;
}
