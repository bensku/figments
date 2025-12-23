import { Config } from './schema';

async function loadConfig(): Promise<Config> {
    const path =
        process.env.FIGMENTS_CONFIG_PATH ??
        // To avoid nasty surprises, default config filename is different in dev mode!
        (process.env.NODE_ENV !== 'production'
            ? 'figments.dev.toml'
            : 'figments.toml');
    console.info('Loading configuration from', path);
    const content = await Bun.file(path).text();
    const parsed = Bun.TOML.parse(content);

    return Config.parse(parsed);
}

// Load config only once and make available everywhere
/**
 * Figments backend configuration loaded from figments.toml.
 */
export const CONFIG = await loadConfig();
