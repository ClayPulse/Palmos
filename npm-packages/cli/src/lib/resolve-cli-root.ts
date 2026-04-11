import {fileURLToPath} from 'url';
import path from 'path';

/**
 * Resolve the root directory of the @pulse-editor/cli package at runtime.
 *
 * This works regardless of package manager (npm, pnpm, yarn) because it uses
 * `import.meta.url` to find where this file lives on disk rather than
 * hard-coding a `node_modules/@pulse-editor/cli` path.
 *
 * File layout at build time:
 *   <cli-root>/dist/lib/resolve-cli-root.js   ← this file (compiled)
 *
 * So the package root is two directories up from __dirname.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Absolute path to the installed @pulse-editor/cli package root (contains dist/) */
export const CLI_ROOT = path.resolve(__dirname, '../..');

/** Absolute path to the cli dist directory */
export const CLI_DIST = path.join(CLI_ROOT, 'dist');

/** Absolute path to the server dist directory */
export const CLI_SERVER_DIR = path.join(CLI_DIST, 'lib/server');

/** Resolve a path relative to the cli dist directory */
export function resolveCliDist(...segments: string[]): string {
	return path.join(CLI_DIST, ...segments);
}
