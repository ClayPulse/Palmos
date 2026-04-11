import {cleanDist} from './execa-utils/clean.js';
import {webpackCompile} from './webpack/compile.js';
import {stageServerRuntime} from './stage-server.js';

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
		await stageServerRuntime();
	}

	await cleanDist();

	await webpackCompile('production', buildTarget);
}
