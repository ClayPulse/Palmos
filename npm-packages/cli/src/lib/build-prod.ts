import {execa} from 'execa';
import fs from 'fs';
import {cleanDist} from './execa-utils/clean.js';
import {webpackCompile} from './webpack/compile.js';

/**
 * Run the production build pipeline in-process. Throws on failure so callers
 * (build command, publish command) can react. This is the single source of
 * truth for what `pulse build` does — do not duplicate this logic elsewhere.
 */
export async function buildProd(
	buildTarget?: 'client' | 'server',
): Promise<void> {
	console.log(
		`🚧 Building for target: ${buildTarget || 'both client and server'}`,
	);

	// Stage the server runtime under node_modules/.pulse/server so the server
	// build has the helpers it needs at the expected path.
	if (buildTarget === 'server' || !buildTarget) {
		if (fs.existsSync('node_modules/.pulse/server')) {
			if (process.platform === 'win32') {
				await execa('rmdir /S /Q node_modules\\.pulse\\server', {
					shell: true,
				});
			} else {
				await execa('rm -rf node_modules/.pulse/server', {
					shell: true,
				});
			}
		}

		if (!fs.existsSync('node_modules/.pulse/server')) {
			if (process.platform === 'win32') {
				await execa('mkdir node_modules\\.pulse\\server', {
					shell: true,
				});
			} else {
				await execa('mkdir -p node_modules/.pulse/server', {
					shell: true,
				});
			}
		}

		if (process.platform === 'win32') {
			await execa(
				'xcopy /E /I node_modules\\@pulse-editor\\cli\\dist\\lib\\server node_modules\\.pulse\\server',
				{shell: true},
			);
		} else {
			await execa(
				'cp -r node_modules/@pulse-editor/cli/dist/lib/server/* node_modules/.pulse/server/',
				{shell: true},
			);
		}
	}

	await cleanDist();

	await webpackCompile('production', buildTarget);
}
