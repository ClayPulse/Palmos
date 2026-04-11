import fs from 'fs';
import path from 'path';
import {execa} from 'execa';
import {CLI_SERVER_DIR} from './resolve-cli-root.js';

/**
 * Copy the CLI's server runtime into node_modules/.pulse/server so the dev/
 * preview/build pipelines can find it at a predictable location.
 *
 * Uses the dynamically-resolved CLI_SERVER_DIR so this works with any package
 * manager layout (npm, pnpm hoisted, yarn PnP, etc.).
 */
export async function stageServerRuntime(): Promise<void> {
	const dest = path.join(process.cwd(), 'node_modules/.pulse/server');

	// Remove existing
	if (fs.existsSync(dest)) {
		if (process.platform === 'win32') {
			await execa(`rmdir /S /Q "${dest}"`, {shell: true});
		} else {
			await execa('rm', ['-rf', dest]);
		}
	}

	// Create directory
	fs.mkdirSync(dest, {recursive: true});

	// Copy server files
	if (process.platform === 'win32') {
		await execa(`xcopy /E /I "${CLI_SERVER_DIR}" "${dest}"`, {
			shell: true,
		});
	} else {
		await execa('cp', ['-r', `${CLI_SERVER_DIR}/.`, dest]);
	}
}
